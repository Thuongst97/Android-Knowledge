/* =========================================================================
   Diagram engine — glass nodes, glowing flow lines with signal pulses,
   hover/focus states, auto tooltips for technical terms, and the shared
   cabin topology component (audio zones + displays per occupant).
   ========================================================================= */
(function () {
  "use strict";
  const esc = window.AAOS.esc;
  const CHAR_W = 6.1; // ≈ width of a 10px mono glyph
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;

  /* ---------------------------------------------------- Term tooltips */
  const TERMS = {
    "AIDL": "Android Interface Definition Language — defines Binder IPC interfaces",
    "Stable AIDL": "Versioned AIDL interface that may cross the system/vendor boundary",
    "VHAL": "Vehicle HAL — translates Vehicle Properties to and from vehicle bus signals",
    "Vehicle HAL": "Translates Vehicle Properties to and from CAN/LIN/Ethernet signals",
    "IVehicle": "The VHAL's AIDL interface: getValues, setValues, subscribe…",
    "IVehicleHardware": "C++ interface the OEM implements below DefaultVehicleHal",
    "DefaultVehicleHal": "AOSP VHAL framework: AIDL handling, subscriptions, pending requests",
    "CAN FD": "CAN with Flexible Data-rate — up to 64-byte frames, 2–8 Mbit/s data phase",
    "CAN-FD": "CAN with Flexible Data-rate — up to 64-byte frames, 2–8 Mbit/s data phase",
    "CAN": "Controller Area Network — robust broadcast bus between ECUs",
    "LIN": "Low-cost single-wire bus for simple actuators (seats, mirrors)",
    "Automotive Ethernet": "100/1000BASE-T1 over one twisted pair; cameras, ADAS, zonal backbones",
    "SOME/IP": "Service-oriented middleware over Automotive Ethernet",
    "MCU": "Real-time microcontroller (AUTOSAR) that owns power and the vehicle buses",
    "ECU": "Electronic Control Unit — one per vehicle function (HVAC, BCM, ADAS…)",
    "ECUs": "Electronic Control Units — one per vehicle function",
    "SoC": "System on Chip running Android (CPU, GPU, NPU, ISP)",
    "Binder": "Android's kernel IPC mechanism with caller identity",
    "Binder driver": "Kernel driver (/dev/binder) that carries every IPC transaction",
    "servicemanager": "Binder name registry — services register, clients look them up",
    "vndservicemanager": "Binder registry for vendor-to-vendor services (/dev/vndbinder)",
    "SocketCAN": "Linux CAN networking API (can0 interfaces)",
    "SerDes": "Serializer/deserializer links (GMSL, FPD-Link) carrying video to displays",
    "HAL": "Hardware Abstraction Layer — vendor implementation behind a stable interface",
    "HALs": "Hardware Abstraction Layers — vendor implementations behind stable interfaces",
    "EVS": "Extended View System — fast camera path for rear-view/surround view",
    "EVS HAL": "Extended View System HAL — fast camera path for rear-view cameras",
    "IAudioControl": "Audio Control HAL — focus, ducking and gain signals to the DSP",
    "Audio HAL": "Delivers PCM streams to the DSP/amplifier per output bus",
    "CarService": "System process holding all vehicle policy; the only path to the VHAL",
    "CarPropertyManager": "App API to read, write and subscribe to Vehicle Properties",
    "CarPropertyService": "CarService component that enforces property permissions",
    "CarAudioService": "Audio zones, volume groups and focus per zone",
    "CarPowerManagementService": "Runs the power state machine with the MCU",
    "CarOccupantZoneService": "Maps occupants ↔ displays ↔ audio zones ↔ users",
    "CarUserService": "Car user lifecycle and User HAL orchestration",
    "CarInputService": "Routes steering-wheel keys and rotary input to displays",
    "VehicleHal": "CarService's single IVehicle client, fanned out to HAL services",
    "VendorServiceController": "Starts OEM plug-in services from config_earlyStartupServices",
    "CarOemProxyService": "Binds the OEM policy service (OemCarService)",
    "OemCarService": "Android 14 OEM policy plug-in (audio focus, volume, ducking)",
    "carpowerpolicyd": "Native daemon applying power policies to components",
    "carwatchdogd": "Native daemon monitoring system health and I/O",
    "system_server": "Process hosting the core Android framework services",
    "Zygote": "Pre-initialized process every app is forked from",
    "Looper": "Per-thread message loop dispatching a MessageQueue",
    "Treble": "System/vendor split with stable, versioned interfaces",
    "VINTF": "Manifests declaring which HAL versions the vendor provides",
    "User HAL": "VHAL properties letting the vehicle approve/react to user changes",
    "MUMD": "Multi-User Multi-Display — concurrent users per display (Android 14)",
    "hypervisor": "Partitions the SoC into isolated VMs (e.g. IVI vs cluster)",
    "AUTOSAR": "Standard ECU software architecture used on the MCU",
  };
  const TERM_RES = Object.keys(TERMS).sort((a, b) => b.length - a.length).map((k) => [k, new RegExp("(^|[^A-Za-z0-9_])" + k.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "($|[^A-Za-z0-9_])", "i")]);
  function termTip(label) {
    if (!label) return "";
    for (const [k, re] of TERM_RES) if (re.test(label)) return `${k} — ${TERMS[k]}`;
    const g = (window.GLOSSARY || []).find((x) => x.term.toLowerCase() === String(label).toLowerCase());
    return g ? `${g.term} — ${g.full}` : "";
  }
  const tipAttr = (t) => (t ? ` data-tip="${esc(t)}" tabindex="0"` : "");

  /* ---------------------------------------------------- Primitives */
  const D = {
    termTip,
    reducedMotion: REDUCED,

    /** Glass node. opts: {c, soft, title, sub, tip, titleY, center, container} */
    box(x, y, w, h, o = {}) {
      const tip = o.tip !== undefined ? o.tip : termTip(o.title);
      const container = o.container !== undefined ? o.container : w * h > 46000;
      const c = o.c || "#8a8f98";
      const tx = o.center ? x + w / 2 : x + 12;
      const anchor = o.center ? ' text-anchor="middle"' : "";
      const ty = y + (o.titleY || 19);
      let s = `<g class="hd-node${container ? " is-container" : ""}${o.soft ? " soft" : ""}" style="--c:${c}"${tipAttr(tip)}>`;
      s += `<rect class="hd-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`;
      if (!o.soft) s += `<rect class="hd-accent" x="${o.center ? x + w / 2 - Math.min(18, w / 4) : x + 12}" y="${y - 0.5}" width="${Math.min(36, w / 2)}" height="2.5" rx="1.25"/>`;
      if (o.title) s += `<text class="hd-title" x="${tx}" y="${ty}"${anchor}>${esc(o.title)}</text>`;
      if (o.sub) s += `<text class="hd-sub" x="${tx}" y="${ty + 14}"${anchor}>${esc(o.sub)}</text>`;
      return s + `</g>`;
    },
    /** Wrapping row of chips inside [x, x+maxW]. Returns {svg, bottom} */
    chips(x, y, maxW, labels, h = 20, gap = 6) {
      let cx = x, cy = y, svg = "";
      labels.forEach((l) => {
        const w = Math.ceil(l.length * CHAR_W + 14);
        if (cx + w > x + maxW && cx > x) { cx = x; cy += h + gap; }
        svg += `<g class="hd-chip"${tipAttr(termTip(l))}><rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="5"/><text x="${cx + 7}" y="${cy + 14}">${esc(l)}</text></g>`;
        cx += w + gap;
      });
      return { svg, bottom: cy + h };
    },
    /** Equal-width row of boxes. items: [{title, sub, c, tip}] */
    row(x, y, w, h, items, gap = 10, extra = {}) {
      const bw = (w - gap * (items.length - 1)) / items.length;
      return items.map((it, i) => D.box(x + i * (bw + gap), y, bw, h, { center: true, titleY: h / 2 - (it.sub ? 2 : -4), ...extra, ...it })).join("");
    },
    label(x, y, text, anchor = "start") { return `<text class="hd-label" x="${x}" y="${y}" text-anchor="${anchor}">${esc(text)}</text>`; },
    note(x, y, text, anchor = "start") { return `<text class="hd-note" x="${x}" y="${y}" text-anchor="${anchor}">${esc(text)}</text>`; },
    /** Label with a solid pill behind it so it stays legible over lines. lines: string | string[] */
    pill(x, y, lines, anchor = "middle", cls = "", tip = "") {
      const arr = Array.isArray(lines) ? lines : [lines];
      const w = Math.max(...arr.map((l) => l.length)) * 6.35 + 14, h = arr.length * 13 + 6;
      const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
      const tx = anchor === "middle" ? x : anchor === "end" ? x - 7 : x + 7;
      return `<g class="hd-pill ${cls}"${tipAttr(tip)}><rect x="${left}" y="${y - 11}" width="${w}" height="${h}" rx="6"/>` +
        arr.map((l, i) => `<text x="${tx}" y="${y + i * 13}" text-anchor="${anchor}">${esc(l)}</text>`).join("") + `</g>`;
    },
    /** Flow line with arrowhead; ipc/plug lines (or opts.pulse) carry an animated signal pulse. */
    arrow(d, cls = "", id = "hd", opts = {}) {
      const pid = `${id}-a${++uid}`;
      let s = `<path id="${pid}" class="hd-arrow ${cls}" d="${d}" marker-end="url(#${id}-ah${cls ? "-" + cls : ""})"/>`;
      const pulse = opts.pulse !== undefined ? opts.pulse : cls === "ipc" || cls === "plug";
      if (pulse && !REDUCED) {
        s += `<circle class="hd-pulse ${cls}" r="2.8"><animateMotion dur="${opts.dur || 2.6}s" begin="${((uid * 0.37) % 2.6).toFixed(2)}s" repeatCount="indefinite"><mpath href="#${pid}"/></animateMotion></circle>`;
      }
      return s;
    },
    pin(x, y, n) { return `<g class="hd-pin"><circle cx="${x}" cy="${y}" r="10"/><text x="${x}" y="${y + 3.5}" text-anchor="middle">${n}</text></g>`; },
    defs(id = "hd") {
      const m = (suffix, cls) => `<marker id="${id}-ah${suffix}" class="hd-mk ${cls}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker>`;
      return `<defs>${m("", "")}${m("-ipc", "ipc")}${m("-plug", "plug")}${m("-hw", "hw")}${m("-hl", "hl")}</defs>`;
    },
    svg(w, h, body, label) { return `<svg class="hd-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`; },
    /** Attach a moving pulse to an existing path/line element (used by interactive diagrams). */
    attachPulse(el, cls = "", dur = 1.4) {
      if (REDUCED || !el) return null;
      const NS = "http://www.w3.org/2000/svg";
      let d = el.getAttribute("d");
      if (!d && el.tagName === "line") d = `M${el.getAttribute("x1")},${el.getAttribute("y1")} L${el.getAttribute("x2")},${el.getAttribute("y2")}`;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "hd-pulse live " + cls);
      c.setAttribute("r", "3.4");
      const a = document.createElementNS(NS, "animateMotion");
      a.setAttribute("dur", dur + "s");
      a.setAttribute("repeatCount", "indefinite");
      a.setAttribute("path", d);
      c.appendChild(a);
      el.parentNode.appendChild(c);
      return c;
    },
  };

  /* ---------------------------------------------------- Cabin topology */
  const ZONE_COLORS = ["#70cff8", "#34d399", "#fbbf24", "#a78bfa"];
  const SEATS = [
    { z: 0, x: 92, y: 150, label: "Driver" }, { z: 1, x: 248, y: 150, label: "Passenger" },
    { z: 2, x: 92, y: 334, label: "Rear-left" }, { z: 3, x: 248, y: 334, label: "Rear-right" },
  ];
  const DISPLAYS = {
    hud: { z: 0, x: 96, y: 84, w: 72, h: 7, label: "HUD", info: "HUD · DISPLAY_TYPE_HUD" },
    cluster: { z: 0, x: 92, y: 98, w: 80, h: 15, label: "CLUSTER", info: "Instrument cluster · port 1" },
    ivi: { z: 0, x: 180, y: 102, w: 60, h: 22, label: "IVI", info: "Center display · MAIN · port 0" },
    pax: { z: 1, x: 248, y: 98, w: 80, h: 15, label: "PAX", info: "Passenger display · MAIN · port 2" },
    rsel: { z: 2, x: 96, y: 290, w: 76, h: 15, label: "RSE-L", info: "Rear-left RSE · MAIN · port 3" },
    rser: { z: 3, x: 252, y: 290, w: 76, h: 15, label: "RSE-R", info: "Rear-right RSE · MAIN · port 4" },
  };
  const AUDIO_OUT = [
    { z: 0, kind: "spk", pts: [[66, 180], [354, 180], [66, 372], [354, 372]], bus: "bus0_media_out … bus5_alarm_out", info: "Cabin speakers (primary zone)" },
    { z: 1, kind: "head", pts: [[288, 160]], bus: "bus100_audio_zone_1", info: "Headrest speaker / BT headset" },
    { z: 2, kind: "phones", pts: [[132, 344]], bus: "bus200_audio_zone_2", info: "Rear-left headphones" },
    { z: 3, kind: "phones", pts: [[288, 344]], bus: "bus300_audio_zone_3", info: "Rear-right headphones" },
  ];

  function Cabin(host, opts = {}) {
    const id = "cab" + (++uid);
    const mode0 = opts.mode || "both";
    const seatW = 80, seatH = 104;
    let s = `<defs><linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--panel)"/><stop offset="1" stop-color="var(--panel-2)"/></linearGradient></defs>`;
    // body
    s += `<path class="cab-body" fill="url(#${id}-body)" d="M118,26 H302 Q362,26 364,96 V478 Q362,546 296,548 H124 Q58,546 56,478 V96 Q58,26 118,26 Z"/>`;
    s += `<path class="cab-glass" d="M78,80 Q210,52 342,80"/><path class="cab-glass" d="M86,520 Q210,536 334,520"/>`;
    s += `<line class="cab-dash" x1="70" y1="130" x2="350" y2="130"/><rect class="cab-console" x="196" y="140" width="28" height="130" rx="8"/>`;
    s += `<text class="cab-front" x="210" y="18" text-anchor="middle">▲ FRONT</text>`;
    // routes (drawn under seats so seats stay crisp)
    const dsp = [210, 512];
    s += `<g class="cab-hal"${tipAttr("Audio HAL — routes each zone's mix to its own output buses / DSP channels")}><rect x="${dsp[0] - 62}" y="${dsp[1] - 13}" width="124" height="24" rx="7"/><text x="${dsp[0]}" y="${dsp[1] + 3}" text-anchor="middle">Audio HAL · DSP</text></g>`;
    AUDIO_OUT.forEach((o) => {
      o.pts.forEach((p, k) => {
        const pid = `${id}-ar${o.z}-${k}`;
        const d = `M${dsp[0]},${dsp[1] - 13} C${dsp[0]},${p[1] + 110} ${p[0]},${p[1] + 80} ${p[0]},${p[1] + 12}`;
        s += `<g class="cab-route audio" data-z="${o.z}" style="--zc:${ZONE_COLORS[o.z]}"><path id="${pid}" d="${d}"/>${REDUCED ? "" : `<circle r="2.6"><animateMotion dur="2.4s" begin="${(k * 0.5 + o.z * 0.3).toFixed(1)}s" repeatCount="indefinite"><mpath href="#${pid}"/></animateMotion></circle>`}</g>`;
      });
    });
    Object.entries(DISPLAYS).forEach(([key, dd]) => {
      const seat = SEATS[dd.z];
      const sx = seat.x + seatW / 2 + (key === "ivi" ? -14 : key === "hud" ? 14 : 0), sy = seat.y + 30;
      const fx = dd.x + dd.w / 2, fy = dd.y + dd.h;
      const pid = `${id}-dr-${key}`;
      const d = `M${fx},${fy} C${fx},${fy + 26} ${sx},${sy - 26} ${sx},${sy}`;
      s += `<g class="cab-route display" data-z="${dd.z}" data-d="${key}" style="--zc:${ZONE_COLORS[dd.z]}"><path id="${pid}" d="${d}"/>${REDUCED ? "" : `<circle r="2.4"><animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#${pid}"/></animateMotion></circle>`}</g>`;
    });
    // seats
    SEATS.forEach((st) => {
      s += `<g class="cab-seat" data-z="${st.z}" style="--zc:${ZONE_COLORS[st.z]}" tabindex="0" role="button" aria-label="${st.label}, zone ${st.z}"${tipAttr("")}>
        <rect class="seat-back" x="${st.x}" y="${st.y}" width="${seatW}" height="${seatH}" rx="20"/>
        <rect class="seat-head" x="${st.x + 22}" y="${st.y - 10}" width="36" height="14" rx="6"/>
        <text class="seat-name" x="${st.x + seatW / 2}" y="${st.y + 52}" text-anchor="middle">${st.label}</text>
        <text class="seat-zone" x="${st.x + seatW / 2}" y="${st.y + 68}" text-anchor="middle">Zone ${st.z}</text></g>`;
    });
    // audio outputs
    AUDIO_OUT.forEach((o) => {
      o.pts.forEach((p) => {
        const icon = o.kind === "phones"
          ? `<path d="M${p[0] - 9},${p[1] + 4} v-3 a9,9 0 0 1 18,0 v3"/><rect x="${p[0] - 11}" y="${p[1] + 2}" width="5" height="9" rx="2"/><rect x="${p[0] + 6}" y="${p[1] + 2}" width="5" height="9" rx="2"/>`
          : `<circle cx="${p[0]}" cy="${p[1]}" r="8"/><circle cx="${p[0]}" cy="${p[1]}" r="3.2" class="cone"/>`;
        s += `<g class="cab-out audio" data-z="${o.z}" style="--zc:${ZONE_COLORS[o.z]}"${tipAttr(`${o.info} — ${o.bus}`)}>${icon}</g>`;
      });
    });
    // displays
    Object.entries(DISPLAYS).forEach(([key, dd]) => {
      s += `<g class="cab-disp" data-z="${dd.z}" data-d="${key}" style="--zc:${ZONE_COLORS[dd.z]}" tabindex="0" role="button" aria-label="${dd.info}"${tipAttr(dd.info)}>
        <rect x="${dd.x}" y="${dd.y}" width="${dd.w}" height="${dd.h}" rx="4"/>${dd.h > 10 ? `<text x="${dd.x + dd.w / 2}" y="${dd.y + dd.h / 2 + 3.5}" text-anchor="middle">${dd.label}</text>` : ""}</g>`;
    });

    host.innerHTML = `
      <div class="cab-toolbar" role="group" aria-label="Routing overlay">
        <button class="btn sm" data-mode="both">Audio + displays</button>
        <button class="btn sm" data-mode="audio">🔊 Audio zones</button>
        <button class="btn sm" data-mode="display">🖥️ Displays</button>
      </div>
      <svg class="cabin-svg mode-${mode0}" viewBox="0 0 420 560" role="img" aria-label="Cabin topology: occupants, displays and audio zones">${s}</svg>
      <div class="cab-legend">${SEATS.map((st) => `<button class="cab-key" data-z="${st.z}" style="--zc:${ZONE_COLORS[st.z]}"><i></i>Zone ${st.z} · ${st.label}</button>`).join("")}</div>`;

    const svg = host.querySelector("svg");
    const setMode = (m) => {
      svg.classList.remove("mode-both", "mode-audio", "mode-display");
      svg.classList.add("mode-" + m);
      host.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("primary", b.dataset.mode === m));
    };
    const select = (z, dKey) => {
      svg.classList.toggle("has-sel", z !== null && z !== undefined);
      svg.querySelectorAll("[data-z]").forEach((el) => el.classList.toggle("on", +el.dataset.z === z));
      svg.querySelectorAll(".cab-disp").forEach((el) => el.classList.toggle("picked", !!dKey && el.dataset.d === dKey));
      svg.querySelectorAll(".cab-route.display").forEach((el) => el.classList.toggle("picked", !!dKey && el.dataset.d === dKey));
      host.querySelectorAll(".cab-key").forEach((b) => b.classList.toggle("on", +b.dataset.z === z));
    };
    const fire = (el) => {
      if (el.classList.contains("cab-disp") && opts.onDisplay) opts.onDisplay(el.dataset.d);
      else if (opts.onZone) opts.onZone(+el.dataset.z);
    };
    svg.addEventListener("click", (e) => { const el = e.target.closest(".cab-seat, .cab-disp"); if (el) fire(el); });
    svg.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest(".cab-seat, .cab-disp")) { e.preventDefault(); fire(e.target.closest(".cab-seat, .cab-disp")); } });
    host.querySelector(".cab-toolbar").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
    host.querySelector(".cab-legend").addEventListener("click", (e) => { const b = e.target.closest(".cab-key"); if (b && opts.onZone) opts.onZone(+b.dataset.z); });
    setMode(mode0);
    return { select, setMode, ZONE_COLORS };
  }

  window.AAOS.Diagram = D;
  window.AAOS.Cabin = Cabin;
})();
