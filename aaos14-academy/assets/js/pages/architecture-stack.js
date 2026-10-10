/* 5-layer hierarchical stack + interactive HVAC signal flow (architecture page) */
(function () {
  "use strict";
  const { $, $$, esc, codeBlockHTML, wireCopy, Diagram: D } = window.AAOS;
  const CYAN = "var(--dg-cyan)", VIOLET = CYAN, PINK = "var(--dg-amber)", GREEN = CYAN, AMBER = "var(--dg-amber)";
  const tip = (label, extra) => { const t = extra || D.termTip(label); return t ? ` data-tip="${esc(t)}" tabindex="0"` : ""; };

  /* =========================== 5-layer stack =========================== */
  const LAYERS = [
    { n: "L1", i: 0, name: "Applications", c: CYAN, chips: ["Car Launcher", "HVAC (CarSystemUI)", "Cluster app", "OEM apps", "Car App Library"], meta: [["Language", "Kotlin / Java"], ["Process", "one per app"], ["Partition", "/system · /product · /data"]] },
    { n: "L2", i: 1, name: "Car API & Framework", c: VIOLET, chips: ["CarPropertyManager", "CarAudioManager", "CarPowerManager", "CarService", "VehicleHal"], meta: [["Language", "Java"], ["Process", "com.android.car"], ["Partition", "/system + updatable APEX"]] },
    { n: "L3", i: 2, name: "System IPC / AIDL contract", c: PINK, chips: ["IVehicle.aidl", "IVehicleCallback.aidl", "Binder", "servicemanager", "VINTF"], meta: [["Language", "Stable AIDL"], ["Transport", "Binder driver"], ["Rule", "versioned · @VintfStability"]], boundary: true },
    { n: "L4", i: 3, name: "Vehicle HAL (VHAL)", c: GREEN, chips: ["DefaultVehicleHal", "IVehicleHardware", "SubscriptionManager", "DBC mapping"], meta: [["Language", "C++"], ["Process", "vehicle HAL service"], ["Partition", "/vendor"]] },
    { n: "L5", i: 4, name: "MCU & Vehicle Bus", c: AMBER, chips: ["MCU", "AUTOSAR", "CAN FD", "LIN", "Automotive Ethernet", "SocketCAN"], meta: [["Language", "C (embedded)"], ["Runs on", "MCU + kernel drivers"], ["Partition", "outside Android"]] },
  ];
  const CHIP_TIPS = {
    "Car Launcher": "Car Launcher — IVI home screen on the main display",
    "HVAC (CarSystemUI)": "CarSystemUI — system bars and the climate panel",
    "Cluster app": "Cluster app — draws navigation into the instrument cluster via ClusterHomeManager",
    "OEM apps": "OEM apps — privileged system apps (drive modes, EV charging, 360° camera)",
    "Car App Library": "Car App Library — template-based third-party apps, safe while driving",
    "CarAudioManager": "CarAudioManager — audio zones, volume groups, focus",
    "CarPowerManager": "CarPowerManager — power state listeners and power policies",
    "IVehicle.aidl": "IVehicle.aidl — getValues / setValues / subscribe",
    "IVehicleCallback.aidl": "IVehicleCallback.aidl — oneway results and property events",
    "SubscriptionManager": "SubscriptionManager — which client listens to which property, at what rate",
    "DBC mapping": "DBC mapping — property ID ↔ CAN frame/signal (start bit, scale, offset)",
  };
  const ZONES = [
    { label: "Android user space", sub: "apps & car-lib", zc: CYAN, layers: [0] },
    { link: { lk: VIOLET, html: "<b>Binder IPC</b> · car-lib managers are proxies to <code>ICarProperty</code> / <code>ICar</code> in CarService" } },
    { label: "System services", sub: "framework · policy & permissions", zc: VIOLET, layers: [1] },
    { link: { lk: VIOLET, html: "<b>Binder IPC</b> · <code>IVehicle.setValues()</code> down · <code>IVehicleCallback.onPropertyEvent()</code> up" } },
    { label: "Treble boundary", sub: "stable, versioned contract between /system and /vendor", zc: PINK, layers: [2], boundary: true },
    { link: { lk: PINK, html: "<b>Implemented by</b> <code>DefaultVehicleHal</code> (<code>BnVehicle</code>) in the vendor VHAL process" } },
    { label: "Native hardware abstraction (HAL)", sub: "vendor C++ on /vendor", zc: GREEN, layers: [3] },
    { link: { lk: AMBER, html: "<b>Hardware drivers</b> · SocketCAN / SPI / Ethernet → MCU → CAN FD frames" } },
    { label: "MCU & vehicle bus", sub: "real-time world outside Android", zc: AMBER, layers: [4] },
  ];
  const layerHTML = (l) => `<button class="s5-layer" style="--lc:${l.c}" data-i="${l.i}" aria-label="${l.n} ${esc(l.name)} — open in layer explorer">
      <span class="s5-badge">${l.n}</span>
      <span class="s5-main"><b>${esc(l.name)}</b><span class="s5-chips">${l.chips.map((c) => `<span${tip(c, CHIP_TIPS[c])}>${esc(c)}</span>`).join("")}</span></span>
      <span class="s5-meta">${l.meta.map((m) => `<span>${esc(m[0])}: <b>${esc(m[1])}</b></span>`).join("")}</span>
    </button>`;
  const stack = $("#stack5");
  if (stack) {
    stack.innerHTML = ZONES.map((z) => z.link
      ? `<div class="s5-link" style="--lk:${z.link.lk}"><span class="s5-line"><i class="down"></i><i class="up"></i></span><span class="s5-link-label">${z.link.html}</span></div>`
      : `<div class="s5-zone${z.boundary ? " s5-boundary" : ""}" style="--zc:${z.zc}"><div class="s5-zone-label">${esc(z.label)}<small>${esc(z.sub)}</small></div>${z.layers.map((i) => layerHTML(LAYERS[i])).join("")}</div>`
    ).join("");
    stack.addEventListener("click", (e) => {
      if (e.target.closest(".s5-chips span")) return; // chips show tooltips; don't navigate
      const b = e.target.closest(".s5-layer");
      if (b && window.AAOS.showLayer) window.AAOS.showLayer(+b.dataset.i);
    });
  }

  /* =========================== HVAC signal flow =========================== */
  const host = $("#signal-flow-diagram");
  if (!host) return;
  const NODES = [
    { t: "Touchscreen App", l: "[App] L1", sub: "com.oem.hvac · Kotlin", c: CYAN, tip: "HVAC app UI — shows the value the vehicle reports, never just the intent" },
    { t: "CarPropertyManager", l: "[API] L2", sub: "android.car · in-process", c: VIOLET },
    { t: "CarService", l: "[Svc] L2", sub: "CarPropertyService", c: VIOLET },
    { t: "AIDL IVehicle", l: "[AIDL] L3", sub: "Binder · Treble boundary", c: PINK },
    { t: "C++ VHAL", l: "[HAL] L4", sub: "DefaultVehicleHal", c: GREEN, tip: "VHAL — translates the property into the OEM's CAN signal" },
    { t: "CAN Driver", l: "[Driver] L5", sub: "SocketCAN can0 / MCU", c: AMBER, tip: "CAN driver — SocketCAN or an SPI link to the MCU that owns the bus" },
    { t: "HVAC ECU", l: "[ECU] L5", sub: "CAN FD · blend door", c: AMBER, tip: "HVAC ECU — applies the setpoint and reports the actual state" },
  ];
  const S = [
    { node: 0, link: -1, dir: "req", title: "Tap ▲ — the UI shows 24.0 °C as pending", ipc: "Main thread", detail: "The climate panel receives the touch. Good AAOS UIs never treat the requested value as truth: they show a pending state until the vehicle confirms.", lang: "kotlin", file: "HvacFragment.kt", code: "binding.btnUp.setOnClickListener {\n    viewModel.showPending(24.0f)          // amber: waiting for the car\n    controller.setDriverTemperature(24.0f)\n}" },
    { node: 1, link: 0, dir: "req", title: "setFloatProperty() in the app process", ipc: "In-process call", detail: "CarPropertyManager is a library inside the app. The call returns almost immediately; no IPC has happened yet.", lang: "kotlin", file: "VehicleDataController.kt", code: "propertyManager.setFloatProperty(\n    VehiclePropertyIds.HVAC_TEMPERATURE_SET,  // 0x15600503\n    VehicleAreaSeat.SEAT_ROW_1_LEFT,          // 0x0001\n    24.0f\n)" },
    { node: 2, link: 1, dir: "req", title: "Binder IPC → CarService checks permission, area and range", ipc: "Binder IPC #1", detail: "The kernel stamps the caller's UID. CarPropertyService verifies CONTROL_CAR_CLIMATE, the areaId and the [min, max] range before anything reaches the vehicle.", lang: "java", file: "CarPropertyService.java (abridged)", code: "public void setProperty(CarPropertyValue value, ICarPropertyEventListener l) {\n    assertWritePermission(value.getPropertyId());  // CONTROL_CAR_CLIMATE\n    validateSetParameters(value);                  // areaId, 16.0 ≤ v ≤ 28.0\n    mPropertyHalService.setProperty(value);\n}" },
    { node: 3, link: 2, dir: "req", title: "IVehicle.setValues() crosses the Treble boundary", ipc: "Binder IPC #2 · Stable AIDL", detail: "CarService calls the versioned AIDL interface of the vendor VHAL. Each request carries a requestId; the call returns at once and the result arrives via IVehicleCallback.", lang: "java", file: "AidlVehicleStub.java (abridged)", code: "SetValueRequest req = new SetValueRequest();\nreq.requestId = mRequestId.getAndIncrement();\nreq.value = (VehiclePropValue) halPropValue.toVehiclePropValue();\nmAidlVehicle.setValues(mCallback, requests);   // → /vendor" },
    { node: 4, link: 3, dir: "req", title: "VHAL encodes the property into a CAN signal", ipc: "C++ · vendor process", detail: "DefaultVehicleHal tracks the pending request and calls the OEM's IVehicleHardware, which maps HVAC_TEMPERATURE_SET + SEAT_ROW_1_LEFT to frame 0x3A2: raw = 24.0 / 0.5 = 0x30.", lang: "cpp", file: "OemVehicleHardware.cpp", code: "can_frame f{};\nf.can_id  = 0x3A2;                                // hypothetical DBC\nf.can_dlc = 8;\nf.data[0] = 0x01;                                 // SEAT_ROW_1_LEFT\nf.data[1] = std::lround(24.0f / 0.5f);            // 0x30\nf.data[7] = crc8(f.data, 7);                      // E2E protection" },
    { node: 5, link: 4, dir: "req", title: "The driver puts the frame on the bus", ipc: "Hardware driver", detail: "The VHAL writes to SocketCAN (or sends it to the MCU over SPI). The frame arbitrates by ID on CAN FD.", lang: "cpp", file: "OemVehicleHardware.cpp", code: "write(mCanSocket, &f, sizeof(f));   // can0  3A2#0130050000000071" },
    { node: 6, link: 5, dir: "req", title: "HVAC ECU applies the setpoint", ipc: "CAN FD frame 0x3A2", detail: "The ECU validates the frame (counter + CRC), moves the blend door and updates its state in its own 10–100 ms cycle.", lang: "conf", file: "candump can0", code: "can0  3A2   [8]  01 30 05 00 00 00 00 71   # setpoint request" },
    { node: 5, link: 5, dir: "back", title: "ECU broadcasts its status frame", ipc: "CAN FD frame 0x3A3", detail: "The ECU reports the setpoint it actually applied — the source of truth for the UI.", lang: "conf", file: "candump can0", code: "can0  3A3   [8]  01 30 05 00 00 00 00 9C   # status: 24.0 °C applied" },
    { node: 4, link: 4, dir: "back", title: "VHAL decodes it into a property event", ipc: "C++ RX thread", detail: "The OEM's CAN reader thread turns 0x3A3 into a VehiclePropValue (timestamped) and calls the registered PropertyChangeCallback.", lang: "cpp", file: "OemVehicleHardware.cpp", code: "VehiclePropValue v{.timestamp = elapsedRealtimeNano(),\n    .areaId = kRow1Left, .prop = toInt(VehicleProperty::HVAC_TEMPERATURE_SET)};\nv.value.floatValues = {frame.data[1] * 0.5f};     // 24.0\n(*mOnPropertyChange)({v});" },
    { node: 3, link: 3, dir: "back", title: "IVehicleCallback.onPropertyEvent() (oneway)", ipc: "Binder IPC #3 · oneway", detail: "The VHAL pushes the event to CarService without blocking; batches use shared memory.", lang: "aidl", file: "IVehicleCallback.aidl", code: "oneway interface IVehicleCallback {\n    void onPropertyEvent(in VehiclePropValues propValues,\n                         int sharedMemoryFileCount);\n}" },
    { node: 2, link: 2, dir: "back", title: "CarService fans the event out to subscribers", ipc: "Permission-checked fan-out", detail: "Every client subscribed to the property (with read permission) receives it — the rear-seat climate panel and a cluster widget update too.", lang: "java", file: "CarPropertyService.java (abridged)", code: "for (Client c : clientsSubscribedTo(propId, areaId)) {\n    c.getListener().onEvent(List.of(new CarPropertyEvent(\n        CarPropertyEvent.PROPERTY_EVENT_PROPERTY_CHANGE, value)));\n}" },
    { node: 1, link: 1, dir: "back", title: "ICarPropertyEventListener.onEvent() into the app", ipc: "Binder IPC #4 · oneway", detail: "The event lands on a binder thread of the app; CarPropertyManager re-dispatches it on the Car object's handler (main thread by default).", lang: "java", file: "CarPropertyManager (internal)", code: "// binder thread → Handler(Looper) of the Car object\nmHandler.post(() -> callback.onChangeEvent(value));" },
    { node: 0, link: 0, dir: "back", title: "onChangeEvent(24.0) — the UI confirms", ipc: "Main thread", detail: "The app matches propertyId and areaId and replaces the pending value with the value the car reported. Total time ≈ 70 ms, mostly the ECU cycle and the UI frame.", lang: "kotlin", file: "VehicleDataController.kt", code: "override fun onChangeEvent(value: CarPropertyValue<*>) {\n    if (value.propertyId == VehiclePropertyIds.HVAC_TEMPERATURE_SET)\n        viewModel.confirmTemperature(value.value as Float)   // 24.0 ✓\n}" },
  ];

  host.innerHTML = `
    <div class="sf-track" role="list">
      ${NODES.map((n, i) => (i ? `<div class="sf-link" data-link="${i - 1}" aria-hidden="true"><span class="sf-pulse"></span></div>` : "") +
        `<button class="sf-node" role="listitem" data-node="${i}" style="--nc:${n.c}"${n.tip ? ` data-tip="${esc(n.tip)}"` : (D.termTip(n.t) ? ` data-tip="${esc(D.termTip(n.t))}"` : "")}>
          <span class="sf-layer">${n.l}</span><b>${esc(n.t).replace(/([a-z])([A-Z])/g, "$1<wbr>$2")}</b><small>${esc(n.sub)}</small>${i === 0 || i === 6 ? `<div class="sf-val" data-val="${i}"></div>` : ""}
        </button>`).join("")}
    </div>
    <div class="sf-controls">
      <button class="btn sm" data-sf="reset">⟲ Reset</button>
      <button class="btn sm" data-sf="prev">◀ Prev</button>
      <button class="btn sm primary" data-sf="play">▶ Play</button>
      <button class="btn sm" data-sf="next">Next ▶</button>
      <span class="sf-dir" id="sf-dir">Idle</span>
      <span class="sf-count" id="sf-count">0 / ${S.length}</span>
    </div>
    <div class="sf-detail" id="sf-detail"></div>`;

  const nodes = $$(".sf-node", host), links = $$(".sf-link", host);
  const dirEl = $("#sf-dir", host), countEl = $("#sf-count", host), detail = $("#sf-detail", host), playBtn = $('[data-sf="play"]', host);
  const uiVal = $('[data-val="0"]', host), ecuVal = $('[data-val="6"]', host);
  let cur = -1, timer = null;

  function render() {
    const s = S[cur];
    nodes.forEach((n, i) => {
      n.classList.toggle("active", !!s && s.node === i);
      n.classList.toggle("visited", cur >= 0 && (cur >= 6 ? true : i <= cur));
    });
    links.forEach((l, i) => {
      l.classList.toggle("active", !!s && s.link === i);
      l.classList.toggle("back", !!s && s.link === i && s.dir === "back");
      l.classList.toggle("done", cur >= 0 && (s.dir === "req" ? i < s.link : i > s.link || cur >= 6));
    });
    uiVal.className = "sf-val" + (cur < 0 ? "" : cur < S.length - 1 ? " pending" : " ok");
    uiVal.textContent = cur < 0 ? "22.0°" : cur < S.length - 1 ? "24.0° ⏳" : "24.0° ✓";
    ecuVal.className = "sf-val" + (cur >= 6 ? " ok" : "");
    ecuVal.textContent = cur >= 6 ? "24.0 °C" : "22.0 °C";
    countEl.textContent = `${cur + 1} / ${S.length}`;
    dirEl.className = "sf-dir" + (s ? (s.dir === "req" ? " req" : " back") : "");
    dirEl.textContent = s ? (s.dir === "req" ? "Request ➔" : "⟵ Feedback") : "Idle";
    if (!s) {
      detail.innerHTML = `<div><span class="badge gray">Ready</span><h4>Send the command</h4><p class="small muted">Press ▶ Play, use Next, or click a node. Cyan pulses travel the request path; green pulses carry the vehicle's confirmation back.</p></div>
        <div class="callout analogy" style="margin:0"><div class="ci">🎭</div><div><span class="ct">Analogy</span><p>A registered letter: the post office (CarService) checks the sender, the sorting center (VHAL) translates the address into the local format (CAN), the courier (bus) delivers it — and the signed receipt (status frame) travels all the way back.</p></div></div>`;
      return;
    }
    const n = NODES[s.node];
    detail.innerHTML = `<div><span class="badge" style="color:${n.c};border-color:color-mix(in srgb, ${n.c} 40%, transparent);background:color-mix(in srgb, ${n.c} 8%, transparent)">${n.l}</span> <span class="badge gray">${esc(s.ipc)}</span>
        <h4>${cur + 1}. ${esc(s.title)}</h4><p class="small">${esc(s.detail)}</p></div>
      <div>${codeBlockHTML({ code: s.code, lang: s.lang, file: s.file, label: s.lang })}</div>`;
    wireCopy(detail);
  }
  const go = (i) => { cur = Math.max(-1, Math.min(S.length - 1, i)); render(); };
  const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = "▶ Play"; };
  const play = () => {
    if (timer) return stop();
    if (cur >= S.length - 1) go(-1);
    playBtn.textContent = "⏸ Pause";
    go(cur + 1);
    timer = setInterval(() => (cur >= S.length - 1 ? stop() : go(cur + 1)), 1900);
  };
  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sf]");
    if (b) {
      const a = b.dataset.sf;
      if (a !== "play") stop();
      if (a === "next") go(cur + 1);
      if (a === "prev") go(cur - 1);
      if (a === "reset") go(-1);
      if (a === "play") play();
      return;
    }
    const n = e.target.closest(".sf-node");
    if (n) { stop(); go(+n.dataset.node); }
  });
  host.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(cur + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(cur - 1); }
  });
  render();
})();
