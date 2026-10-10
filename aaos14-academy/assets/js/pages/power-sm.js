/* Power management state machine v2 — states, labelled triggers, glow + signal pulses */
(function () {
  "use strict";
  const { $, $$, esc, Diagram: D } = window.AAOS;
  const W = 196, H = 60;
  const C = { slate: "#8a8f98", emerald: "#34d399", cyan: "#70cff8", amber: "#fbbf24", gold: "#d4af37", violet: "#a78bfa", red: "#f87171" };

  const NODES = {
    WAIT: { x: 190, y: 255, label: "WAIT_FOR_VHAL", sub: "booted · awaiting MCU", c: C.slate },
    ON: { x: 450, y: 80, label: "ON", sub: "normal operation", c: C.emerald },
    SP: { x: 770, y: 80, label: "SHUTDOWN_PREPARE", sub: "listeners notified · display off", c: C.amber },
    GM: { x: 770, y: 270, label: "GARAGE_MODE", sub: "idle jobs · SHUTDOWN_POSTPONE", c: C.gold, sub2: true },
    S2R: { x: 770, y: 455, label: "SUSPEND_TO_RAM", sub: "Deep Sleep · DRAM self-refresh", c: C.cyan },
    HIB: { x: 480, y: 455, label: "HIBERNATION", sub: "Suspend-to-Disk · 0 mA", c: C.violet },
    OFF: { x: 190, y: 455, label: "SHUTDOWN", sub: "power off · cold boot next", c: C.red },
  };
  const EDGES = [
    { id: "boot", f: "BOOT", t: "WAIT", d: "M50,255 H90", tip: "Power-on — the MCU powers the SoC; Android boots and CPMS starts in WAIT_FOR_VHAL" },
    { id: "on", f: "WAIT", t: "ON", d: "M230,225 C250,140 300,80 350,80", lab: ["AP_POWER_STATE_REQ", "= ON"], lx: 262, ly: 148, tip: "REQ = ON — the MCU confirms normal operation; CPMS reports ON and applies the all-on power policy" },
    { id: "ign", f: "ON", t: "SP", d: "M548,80 H670", lab: ["Ignition OFF", "REQ = SHUTDOWN_PREPARE"], lx: 609, ly: 18, tip: "Ignition OFF — the MCU requests SHUTDOWN_PREPARE with a parameter (CAN_SLEEP, CAN_HIBERNATE, SHUTDOWN_ONLY…)" },
    { id: "gm", f: "SP", t: "GM", d: "M770,110 V238", lab: ["Idle jobs pending", "CAN_SLEEP / CAN_HIBERNATE"], lx: 782, ly: 168, a: "start", tip: "Garage Mode starts unless the parameter is *_IMMEDIATELY; JobScheduler runs idle jobs" },
    { id: "s2r", f: "GM", t: "S2R", d: "M770,300 V423", lab: ["Jobs done / timer expired", "→ DEEP_SLEEP_ENTRY"], lx: 782, ly: 358, a: "start", tip: "Garage Mode timer expired or all jobs finished — CPMS reports DEEP_SLEEP_ENTRY and the kernel suspends to RAM" },
    { id: "hib", f: "GM", t: "HIB", d: "M690,292 C620,330 540,370 500,423", lab: ["CAN_HIBERNATE", "→ HIBERNATION_ENTRY"], lx: 594, ly: 350, tip: "With CAN_HIBERNATE, the memory image is written to flash and power is cut completely" },
    { id: "cancel", f: "GM", t: "WAIT", d: "M672,258 C560,222 400,248 290,250", lab: ["Driver returns", "CANCEL_SHUTDOWN"], lx: 470, ly: 228, tip: "The driver comes back before power-down — REQ = CANCEL_SHUTDOWN, Garage Mode stops, back to WAIT_FOR_VHAL → ON" },
    { id: "guard", f: "SP", t: "OFF", d: "M690,110 C560,230 330,330 230,423", lab: ["Battery guard (low 12 V)", "SHUTDOWN_IMMEDIATELY"], lx: 452, ly: 276, alert: true, tip: "Battery guard trigger — the MCU sees low 12 V and requests an immediate shutdown, skipping Garage Mode" },
    { id: "wake", f: "S2R", t: "WAIT", d: "M770,485 V515 H335 V300 H262 V287", lab: ["Unlock / wake-up", "SUSPEND_EXIT · HIBERNATION_EXIT"], lx: 556, ly: 512, tip: "Unlock or remote wake — the MCU powers the SoC back up; CPMS goes to WAIT_FOR_VHAL" },
    { id: "hibwake", f: "HIB", t: "WAIT", d: "M480,485 V515", noArrow: true },
    { id: "cold", f: "OFF", t: "BOOT", d: "M92,462 C52,462 38,380 38,268", lab: ["Cold boot"], lx: 46, ly: 382, a: "start", tip: "Next power-on is a full cold boot (10–30 s)" },
  ];
  const INFO = {
    WAIT: ["Waiting for VHAL", "CPMS is up but does not yet know what the MCU wants. It reports <code>AP_POWER_STATE_REPORT = WAIT_FOR_VHAL</code> and waits for <code>AP_POWER_STATE_REQ</code>.", ["After boot", "After SUSPEND_EXIT / HIBERNATION_EXIT", "After SHUTDOWN_CANCELLED"], "An employee who has just arrived, waiting for the manager to confirm “it's a normal working day”."],
    ON: ["Running", "Displays, audio and network are on; power policy <code>system_power_policy_all_on</code>. Users can interact.", ["Enter: REQ = ON", "Exit: Ignition OFF → REQ = SHUTDOWN_PREPARE"], "Business hours — the office is open to visitors."],
    SP: ["Preparing to shut down", "Preceded by <code>PRE_SHUTDOWN_PREPARE</code>. CPMS notifies listeners, applies <code>system_power_policy_no_user_interaction</code> and reports <code>SHUTDOWN_PREPARE</code> to the MCU.", ["Parameter decides the path: CAN_SLEEP · CAN_HIBERNATE · SHUTDOWN_ONLY · *_IMMEDIATELY", "Battery guard can force SHUTDOWN_IMMEDIATELY"], "Closing time is announced: visitors leave, lights dim."],
    GM: ["Garage Mode (sub-phase of SHUTDOWN_PREPARE)", "Not a separate CPMS state: it runs <em>inside</em> SHUTDOWN_PREPARE. The device counts as idle, JobScheduler runs idle jobs (OTA, dexopt, sync), and CPMS repeatedly reports <code>SHUTDOWN_POSTPONE</code> so the MCU keeps power on.", ["Ends when jobs finish or the Garage Mode timer expires (<code>maxGarageModeRunningDurationInSecs</code>, 900 s default)", "Cancelled if the driver returns"], "The night cleaning crew works after closing — and stops the moment a customer comes back."],
    S2R: ["Deep sleep", "Android reports <code>DEEP_SLEEP_ENTRY</code>; the kernel writes <code>mem</code> to <code>/sys/power/state</code>. The MCU cuts most SoC rails; DRAM self-refreshes, so resume is fast and apps stay in memory.", ["Drain: a few mA", "Resume: ~1–3 s → SUSPEND_EXIT → WAIT_FOR_VHAL"], "Lights off, papers left on the desk — tomorrow you continue where you stopped."],
    HIB: ["Hibernation", "Android reports <code>HIBERNATION_ENTRY</code>; the memory image goes to flash (<code>/sys/power/state = disk</code>) and power is cut completely.", ["Drain: ≈ 0", "Resume slower than S2R; good for long parking"], "Everything filed in the cabinet and the floor's power switched off."],
    OFF: ["Shutdown", "Android reports <code>SHUTDOWN_START</code> and powers off. The next start is a full cold boot.", ["Used for OTA reboots, faults, battery guard", "Resume: 10–30 s"], "The office is closed and cleared — tomorrow everything is set up from scratch."],
  };

  // ---------- draw ----------
  let s = D.defs("psm");
  s += `<rect class="psm-group" x="652" y="32" width="236" height="290" rx="16"/><text class="psm-group-label" x="664" y="314">SHUTDOWN_PREPARE PHASE</text>`;
  EDGES.forEach((e) => {
    s += `<path class="psm-edge${e.alert ? " alert" : ""}" id="psm-e-${e.id}" data-e="${e.id}" d="${e.d}"${e.noArrow ? "" : ` marker-end="url(#psm-ah${e.alert ? "-hw" : ""})"`}/>`;
  });
  EDGES.forEach((e) => {
    if (!e.lab) return;
    const a = e.a || "middle";
    const w = Math.max(...e.lab.map((l) => l.length)) * 6.35 + 16, h = e.lab.length * 13 + 7;
    const left = a === "middle" ? e.lx - w / 2 : e.lx, tx = a === "middle" ? e.lx : e.lx + 8;
    s += `<g class="psm-elabel${e.alert ? " alert" : ""}" data-e="${e.id}" data-tip="${esc(e.tip)}" tabindex="0"><rect x="${left}" y="${e.ly - 11}" width="${w}" height="${h}" rx="7"/>` +
      e.lab.map((l, i) => `<text class="${i === 0 ? "k" : ""}" x="${tx}" y="${e.ly + i * 13}" text-anchor="${a}">${esc(l)}</text>`).join("") + `</g>`;
  });
  s += `<g data-tip="${esc(EDGES[0].tip)}"><circle cx="38" cy="255" r="11" fill="var(--muted)"/><text x="38" y="282" text-anchor="middle" class="hd-label">START</text></g>`;
  Object.entries(NODES).forEach(([k, n]) => {
    s += `<g class="psm-node${n.sub2 ? " sub" : ""}" data-n="${k}" style="--nc:${n.c}" tabindex="0" role="button" aria-label="${n.label}">
      <rect class="bg" x="${n.x - W / 2}" y="${n.y - H / 2}" width="${W}" height="${H}" rx="13"/>
      <rect class="bar" x="${n.x - W / 2 + 14}" y="${n.y - H / 2 - 0.5}" width="40" height="3" rx="1.5"/>
      <text class="t" x="${n.x}" y="${n.y - 2}" text-anchor="middle">${n.label}</text>
      <text class="s" x="${n.x}" y="${n.y + 15}" text-anchor="middle">${n.sub}</text></g>`;
  });

  const host = $("#sm-svg");
  host.innerHTML = `<div class="psm-toolbar"><button class="btn sm primary" id="psm-sim">▶ Simulate a parking cycle</button><button class="btn sm" id="psm-guard">⚡ Battery guard event</button>
    <span class="small muted" style="align-self:center">Click a state · hover a transition for its trigger</span></div>
    <div class="hd-wrap" style="padding:0">${D.svg(1000, 540, s, "AAOS power management state machine")}</div>`;

  const info = $("#sm-info");
  let timer = null;
  function select(k, onlyEdges) {
    $$(".psm-node", host).forEach((g) => g.classList.toggle("sel", g.dataset.n === k));
    $$(".hd-pulse.live", host).forEach((p) => p.remove());
    EDGES.forEach((e) => {
      const hl = onlyEdges ? onlyEdges.includes(e.id) : e.f === k || e.t === k;
      $$(`[data-e="${e.id}"]`, host).forEach((el) => el.classList.toggle("hl", hl));
      const path = $(`#psm-e-${e.id}`, host);
      if (!e.noArrow) path.setAttribute("marker-end", hl ? `url(#psm-ah-${e.alert ? "hw" : "hl"})` : `url(#psm-ah${e.alert ? "-hw" : ""})`);
      if (hl && (onlyEdges || e.f === k)) D.attachPulse(path, e.alert ? "hw" : "hl", 1.6);
    });
    const n = NODES[k], d = INFO[k];
    info.innerHTML = `<div class="ip-kicker" style="color:${n.c}">${d[0]}</div><h4 class="mono">${n.label}</h4><p>${d[1]}</p>
      <ul class="small">${d[2].map((x) => `<li>${x}</li>`).join("")}</ul>
      <div class="callout analogy" style="margin-bottom:0"><div class="ci">🎭</div><div><span class="ct">Analogy</span><p>${d[3]}</p></div></div>`;
  }
  const stopSim = () => { clearInterval(timer); timer = null; $("#psm-sim").textContent = "▶ Simulate a parking cycle"; };
  function run(seq) {
    stopSim();
    let i = 0;
    $("#psm-sim").textContent = "⏸ Stop";
    const tick = () => { const [k, e] = seq[i]; select(k, e ? [e] : []); i++; if (i >= seq.length) stopSim(); };
    tick();
    timer = setInterval(tick, 1700);
  }
  const PARK = [["ON"], ["SP", "ign"], ["GM", "gm"], ["S2R", "s2r"], ["WAIT", "wake"], ["ON", "on"]];
  const GUARD = [["ON"], ["SP", "ign"], ["OFF", "guard"], ["WAIT", "cold"]];
  $("#psm-sim").addEventListener("click", () => (timer ? stopSim() : run(PARK)));
  $("#psm-guard").addEventListener("click", () => run(GUARD));
  $$(".psm-node", host).forEach((g) => {
    g.addEventListener("click", () => { stopSim(); select(g.dataset.n); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stopSim(); select(g.dataset.n); } });
  });
  select("GM");
})();
