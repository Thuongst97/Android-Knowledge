(function () {
  "use strict";
  const { $, $$, esc, initTabs } = window.AAOS;

  const LAYERS = [
    {
      n: "L1", color: "#70cff8", name: "Applications Layer", sub: "Car Launcher · HVAC · Cluster · OEM",
      intro: "The layer users see. Unlike a phone, the UI must obey <strong>UX Restrictions</strong> while the car is moving, runs across several displays, and many apps are privileged system apps allowed to control the vehicle.",
      components: [
        ["CarLauncher", "The IVI home screen: map, media card, app grid. Runs as the HOME activity on the main display."],
        ["HVAC / CarSystemUI", "Climate panel and the car-specific system bars (status/navigation), part of CarSystemUI."],
        ["Cluster Display App", "Draws navigation/media info into the cluster region via <code>ClusterHomeManager</code>."],
        ["Car Settings / Dialer / Media", "AOSP reference system apps; OEMs usually reskin them with RROs."],
        ["OEM Apps", "Proprietary apps: drive modes, EV charging, 360° camera, seat settings."],
        ["3rd-party (Car App Library)", "Template-based third-party apps (navigation, POI, parking, charging) — safe while driving."],
      ],
      chips: ["CarUxRestrictionsManager", "RRO theming", "android.hardware.type.automotive", "Car App Library"],
      source: [
        ["packages/apps/Car/Launcher", "CarLauncher"],
        ["packages/apps/Car/SystemUI", "CarSystemUI (HVAC panel, status bar)"],
        ["packages/apps/Car/Settings", "Car Settings"],
        ["packages/services/Car/tests/ClusterHomeSample", "Sample cluster app"],
        ["device/&lt;oem&gt;/&lt;product&gt;/overlay", "OEM Runtime Resource Overlays"],
      ],
      flow: "The user taps ▲ on the HVAC panel → the UI handler calls <code>CarPropertyManager.setFloatProperty()</code>. The app does <strong>not</strong> own the “true” state: it shows a pending value and updates when the vehicle reports back.",
      analogy: "Apps are <strong>diners in a restaurant</strong>: they order from the menu (Car API) and nobody walks into the kitchen (hardware). While the car is moving, the restaurant only serves a “reduced menu” (UX Restrictions) so the driver is not distracted.",
    },
    {
      n: "L2", color: "#a78bfa", name: "Car API & Framework", sub: "CarPropertyManager · CarService",
      intro: "Two halves: the <strong>Car API library</strong> (<code>android.car</code>) living inside the app's process, and <strong>CarService</strong> — the system process holding all vehicle policy. This is the “brain” of AAOS.",
      components: [
        ["Car", "Entry point: <code>Car.createCar(context, …)</code> binds to CarService and hands out managers."],
        ["CarPropertyManager", "Read/write/subscribe Vehicle Properties. Backend: <code>CarPropertyService</code> → <code>PropertyHalService</code>."],
        ["CarAudioManager", "Audio zones, volume groups, zone-to-user mapping. Backend: <code>CarAudioService</code>."],
        ["CarPowerManager", "Power state listeners and power policies. Backend: <code>CarPowerManagementService</code>."],
        ["CarOccupantZoneManager", "Maps occupants ↔ displays ↔ audio zones ↔ users."],
        ["CarService", "Persistent process <code>com.android.car</code>. Hosts the VehicleHal client, enforces permissions and dispatches events. <code>CarServiceHelperService</code> in system_server assists with user lifecycle."],
      ],
      chips: ["ICar.aidl", "ICarProperty.aidl", "PropertyHalService", "VehicleHal", "com.android.car.updatable"],
      source: [
        ["packages/services/Car/car-lib", "android.car library (public API)"],
        ["packages/services/Car/service", "CarService: CarPropertyService, CarAudioService, CarPowerManagementService…"],
        ["packages/services/Car/service/src/com/android/car/hal", "VehicleHal, PropertyHalService, PowerHalService"],
        ["packages/services/Car/service-builtin", "Part running in system_server (CarServiceHelperService)"],
      ],
      flow: "<code>CarPropertyManager</code> wraps the value in a <code>CarPropertyValue</code> and makes a Binder call to <code>ICarProperty.setProperty()</code>. Inside CarService, <code>CarPropertyService</code> checks the write permission, area ID and value range, then <code>PropertyHalService</code> converts it to a <code>HalPropValue</code> and sends it down to the VHAL.",
      analogy: "CarService is the <strong>hotel front desk</strong>: every guest request goes through it. The receptionist checks the key card (permission), asks “which room?” (areaId), refuses unreasonable requests (“set the A/C to 50 °C”), and only then calls maintenance.",
    },
    {
      n: "L3", color: "#f472b6", name: "System IPC / AIDL", sub: "IVehicle.aidl · IVehicleCallback.aidl",
      intro: "The stable contract between the framework (system) and the VHAL (vendor). Defined in <strong>Stable AIDL</strong> and carried over <strong>Binder</strong>. Every call is asynchronous: results come back through callbacks.",
      components: [
        ["IVehicle", "<code>getAllPropConfigs</code>, <code>getValues</code>, <code>setValues</code>, <code>subscribe</code>, <code>unsubscribe</code>, <code>returnSharedMemory</code>."],
        ["IVehicleCallback (oneway)", "<code>onGetValues</code>, <code>onSetValues</code>, <code>onPropertyEvent</code>, <code>onPropertySetError</code>."],
        ["VehiclePropValue", "Parcelable: <code>timestamp</code>, <code>areaId</code>, <code>prop</code>, <code>status</code>, <code>RawPropValues value</code>."],
        ["LargeParcelable", "Large requests/results travel through shared memory (<code>sharedMemoryFd</code>) to avoid Binder's 1 MB transaction limit."],
        ["servicemanager", "The VHAL registers as <code>android.hardware.automotive.vehicle.IVehicle/default</code>."],
      ],
      chips: ["@VintfStability", "oneway", "Binder", "ParcelFileDescriptor", "VINTF manifest"],
      source: [
        ["hardware/interfaces/automotive/vehicle/aidl/android/hardware/automotive/vehicle/IVehicle.aidl", "Main interface"],
        ["hardware/interfaces/automotive/vehicle/aidl/android/hardware/automotive/vehicle/IVehicleCallback.aidl", "Callback"],
        ["hardware/interfaces/automotive/vehicle/aidl_property/", "VehicleProperty enum definitions"],
        ["hardware/interfaces/automotive/vehicle/aidl/aidl_api/", "Frozen API snapshots per version"],
      ],
      flow: "CarService calls <code>IVehicle.setValues(callback, SetValueRequests)</code>. The call returns immediately (it does not wait for the ECU). Later the VHAL calls back <code>callback.onSetValues()</code> with a status, and <code>onPropertyEvent()</code> when the actual value changes.",
      analogy: "AIDL is the <strong>standard power socket</strong>: as long as the plug shape matches (interface + version), any manufacturer's appliance fits. You can renovate the whole building (upgrade Android) without replacing the appliances (VHAL).",
    },
    {
      n: "L4", color: "#34d399", name: "Vehicle HAL (VHAL)", sub: "C++ · DefaultVehicleHal · IVehicleHardware",
      intro: "A C++ process on <code>/vendor</code>. AOSP provides the <code>DefaultVehicleHal</code> framework (AIDL handling, subscriptions, pending-request tracking, config checks); the OEM only implements the <code>IVehicleHardware</code> interface to talk to the real hardware.",
      components: [
        ["DefaultVehicleHal", "Implements <code>BnVehicle</code>: validates that properties exist, checks access modes, manages a <code>PendingRequestPool</code> with timeouts."],
        ["IVehicleHardware", "The C++ interface the OEM implements: <code>getAllPropertyConfigs</code>, <code>setValues</code>, <code>getValues</code>, <code>registerOnPropertyChangeEvent</code>…"],
        ["FakeVehicleHardware", "Reference implementation used by the emulator with simulated values — a great place to start learning."],
        ["SubscriptionManager", "Tracks which client subscribes to which property and at what sample rate."],
        ["Property mapping", "Table mapping property IDs ↔ CAN signals (frame ID, start bit, scale, offset) — usually generated from DBC files."],
      ],
      chips: ["BnVehicle", "PendingRequestPool", "RecurrentTimer", "VehicleUtils", "sync vs async"],
      source: [
        ["hardware/interfaces/automotive/vehicle/aidl/impl/vhal", "DefaultVehicleHal"],
        ["hardware/interfaces/automotive/vehicle/aidl/impl/hardware/include/IVehicleHardware.h", "Interface for OEMs"],
        ["hardware/interfaces/automotive/vehicle/aidl/impl/fake_impl", "FakeVehicleHardware (emulator)"],
        ["vendor/&lt;oem&gt;/hardware/vehicle", "OEM implementation (see Module 09)"],
      ],
      flow: "<code>DefaultVehicleHal::setValues()</code> validates the request, stores it in the pending pool and calls <code>IVehicleHardware::setValues()</code>. The OEM code encodes the float 24.0 into CAN bytes and writes them to a socket/SPI. Results come back via <code>SetValuesCallback</code>; new values from the bus are pushed up via <code>PropertyChangeCallback</code>.",
      analogy: "The VHAL is the <strong>interpreter at a multilingual conference</strong>: it hears “HVAC_TEMPERATURE_SET = 24.0 for the left seat” in Android-speak and repeats it in the carmaker's CAN dialect: “frame 0x3A2, byte 1 = 0x30”. Every carmaker speaks a different dialect, so every OEM hires its own interpreter.",
    },
    {
      n: "L5", color: "#fbbf24", name: "MCU & Vehicle Bus", sub: "CAN FD · LIN · Automotive Ethernet",
      intro: "The real-time world outside Android. The VHAL reaches it in one of two ways: <strong>directly</strong> (SocketCAN on the SoC) or, more commonly, <strong>through the MCU</strong> over a proprietary protocol on SPI/UART/Ethernet.",
      components: [
        ["Vehicle MCU", "AUTOSAR Classic; manages SoC power, aggregates signals from several buses and forwards compact packets to the SoC."],
        ["CAN / CAN FD", "Main bus for body, HVAC and chassis. Frames have 11/29-bit IDs and 8 or 64 data bytes."],
        ["LIN", "Low-cost secondary bus for simple actuators."],
        ["Automotive Ethernet", "High bandwidth, SOME/IP; in zonal architectures the VHAL may talk SOME/IP to zone controllers."],
        ["Kernel drivers", "SocketCAN (<code>can0</code>), <code>spidev</code>, SoC-vendor IPC drivers."],
      ],
      chips: ["DBC", "SocketCAN", "SOME/IP", "AUTOSAR COM", "E2E protection"],
      source: [
        ["kernel: drivers/net/can/", "CAN drivers (SocketCAN)"],
        ["vendor/&lt;soc&gt;/…", "SoC↔MCU IPC drivers (not part of AOSP)"],
        ["MCU firmware", "Separate AUTOSAR project, Vector/EB/ETAS tooling"],
      ],
      flow: "Frame <code>0x3A2</code> carrying the setpoint is broadcast on CAN; the HVAC ECU receives it, drives the blend door, then broadcasts status frame <code>0x3A3</code> with the applied setpoint. The VHAL receives that frame and reports it back up to Android.",
      analogy: "The CAN bus is like a <strong>shared walkie-talkie channel on a construction site</strong>: everyone hears every message; messages with a lower priority code (smaller ID) get to talk first. There is no recipient address — whoever cares about a code listens for it.",
    },
  ];

  const stack = $("#layer-stack"), detail = $("#layer-detail");
  const CONNECTORS = ["", "⇣ in-process API call", "⇣ Binder IPC (ICarProperty)", "⇣ Binder IPC (IVehicle) — Treble boundary", "⇣ SPI / SocketCAN"];
  stack.innerHTML = LAYERS.map((l, i) =>
    (i ? `<div class="layer-connector">${CONNECTORS[i]}</div>` : "") +
    `<button class="layer-btn" style="--lc:${l.color}" data-i="${i}" role="option"><span class="ln">${l.n}</span><span><b>${esc(l.name)}</b><small>${esc(l.sub)}</small></span></button>`
  ).join("");

  let current = 0;
  function show(i) {
    current = i;
    const l = LAYERS[i];
    $$(".layer-btn", stack).forEach((b) => { const on = +b.dataset.i === i; b.classList.toggle("sel", on); b.setAttribute("aria-selected", on); });
    detail.style.borderTop = `3px solid ${l.color}`;
    detail.innerHTML = `
      <span class="badge" style="color:${l.color};border-color:${l.color}55;background:${l.color}1a">${l.n}</span>
      <h3>${esc(l.name)}</h3>
      <p>${l.intro}</p>
      <div class="tabs" data-tabs>
        <div class="tab-list" role="tablist">
          <button data-tab="comp" aria-selected="true">Components</button>
          <button data-tab="src">In the source tree</button>
          <button data-tab="flow">Data flow</button>
          <button data-tab="ana">Analogy</button>
        </div>
        <div class="tab-panel" data-panel="comp">
          <dl class="kv">${l.components.map((c) => `<dt><strong>${c[0]}</strong></dt><dd>${c[1]}</dd>`).join("")}</dl>
          <div class="chip-list">${l.chips.map((c) => `<span class="chip">${c}</span>`).join("")}</div>
        </div>
        <div class="tab-panel" data-panel="src">
          <div class="table-wrap"><table class="t"><thead><tr><th>Path</th><th>Contents</th></tr></thead><tbody>
          ${l.source.map((s) => `<tr><td><code>${s[0]}</code></td><td>${s[1]}</td></tr>`).join("")}</tbody></table></div>
        </div>
        <div class="tab-panel" data-panel="flow">
          <p>${l.flow}</p>
          <p class="small muted">See the code for every layer in <a href="code.html#explorer">Example Code and Best Practices</a>.</p>
        </div>
        <div class="tab-panel" data-panel="ana">
          <div class="callout analogy" style="margin-top:0"><div class="ci">🎭</div><div><span class="ct">Analogy</span><p>${l.analogy}</p></div></div>
        </div>
      </div>`;
    initTabs(detail);
  }
  stack.addEventListener("click", (e) => { const b = e.target.closest(".layer-btn"); if (b) show(+b.dataset.i); });
  stack.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = (current + (e.key === "ArrowDown" ? 1 : -1) + LAYERS.length) % LAYERS.length;
      show(n);
      $(`.layer-btn[data-i="${n}"]`, stack).focus();
    }
  });
  show(0);
  window.AAOS.showLayer = (i) => { show(i); document.getElementById("explorer").scrollIntoView({ behavior: "smooth", block: "start" }); };

  /* ------------------------- Property ID decoder ------------------------ */
  const GROUP = { 0x1: "SYSTEM", 0x2: "VENDOR", 0x3: "BACKPORTED" };
  const AREA = { 0x1: "GLOBAL", 0x3: "WINDOW", 0x4: "MIRROR", 0x5: "SEAT", 0x6: "DOOR", 0x7: "WHEEL", 0x8: "VENDOR" };
  const TYPE = { 0x10: "STRING", 0x20: "BOOLEAN", 0x40: "INT32", 0x41: "INT32_VEC", 0x50: "INT64", 0x51: "INT64_VEC", 0x60: "FLOAT", 0x61: "FLOAT_VEC", 0x70: "BYTES", 0xe0: "MIXED" };
  const PRESETS = [
    ["HVAC_TEMPERATURE_SET", 0x15600503, "Per-seat temperature setpoint (°C)"],
    ["PERF_VEHICLE_SPEED", 0x11600207, "Vehicle speed (m/s)"],
    ["GEAR_SELECTION", 0x11400400, "Selected gear"],
    ["HVAC_POWER_ON", 0x15200510, "HVAC on/off per zone"],
    ["INFO_VIN", 0x11100100, "VIN (STATIC)"],
    ["DOOR_LOCK", 0x16200b02, "Lock state per door"],
  ];
  const presets = $("#prop-presets"), input = $("#prop-hex"), bits = $("#prop-bits"), out = $("#prop-out");
  presets.innerHTML = PRESETS.map((p) => `<button class="btn sm" data-v="${p[1]}">${p[0]}</button>`).join("");
  presets.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { input.value = "0x" + (+b.dataset.v).toString(16).padStart(8, "0"); decode(); } });
  input.addEventListener("input", decode);
  function decode() {
    const v = parseInt(input.value.replace(/^0x/i, ""), 16);
    if (isNaN(v) || v < 0 || v > 0xffffffff) { out.innerHTML = `<span class="c-red">Invalid value — enter a 32-bit hex number.</span>`; bits.innerHTML = ""; return; }
    const hex = (v >>> 0).toString(16).padStart(8, "0").toUpperCase();
    const g = (v >>> 28) & 0xf, a = (v >>> 24) & 0xf, t = (v >>> 16) & 0xff, id = v & 0xffff;
    const labels = ["group", "area", "type", "type", "id", "id", "id", "id"];
    const colors = ["var(--purple)", "var(--amber)", "var(--blue)", "var(--blue)", "var(--green)", "var(--green)", "var(--green)", "var(--green)"];
    bits.innerHTML = hex.split("").map((c, i) => `<div style="border-color:${colors[i]}"><b style="color:${colors[i]}">${c}</b>${labels[i]}</div>`).join("");
    const known = PRESETS.find((p) => p[1] === v);
    $$("button", presets).forEach((b) => b.classList.toggle("primary", +b.dataset.v === v));
    out.innerHTML = `
      <dl class="kv">
        <dt>Group</dt><dd><span class="c-purple mono">0x${g.toString(16)}</span> → <strong>${GROUP[g] || "unknown"}</strong>${g === 2 ? " — OEM-specific property" : ""}</dd>
        <dt>Area type</dt><dd><span class="c-amber mono">0x${a.toString(16)}</span> → <strong>${AREA[a] || "unknown"}</strong>${a === 1 ? " (areaId = 0)" : " — an explicit areaId is required to read/write"}</dd>
        <dt>Value type</dt><dd><span class="c-blue mono">0x${t.toString(16).padStart(2, "0")}</span> → <strong>${TYPE[t] || "unknown"}</strong></dd>
        <dt>Identifier</dt><dd><span class="c-green mono">0x${id.toString(16).padStart(4, "0")}</span></dd>
        ${known ? `<dt>Name</dt><dd><code>VehicleProperty::${known[0]}</code> — ${known[2]}</dd>` : ""}
      </dl>`;
  }
  decode();
})();
