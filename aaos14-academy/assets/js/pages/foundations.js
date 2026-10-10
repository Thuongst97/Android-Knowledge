(function () {
  "use strict";
  const { $, $$ } = window.AAOS;

  /* ---- Matrix column focus ---- */
  const table = $("#matrix-table");
  $$("[data-focus]").forEach((b) =>
    b.addEventListener("click", () => {
      table.className = "t matrix" + (b.dataset.focus !== "0" ? " focus-" + b.dataset.focus : "");
      $$("[data-focus]").forEach((x) => x.classList.toggle("primary", x === b));
    })
  );
  table.querySelectorAll("thead th").forEach((th, i) => {
    if (!i) return;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => $(`[data-focus="${i}"]`).click());
  });

  /* ---- Deployment info ---- */
  const INFO = {
    cluster: ["Display", "Instrument Cluster", "The screen behind the steering wheel: speed, tell-tale warning lights, battery level. Usually rendered by a separate ASIL-B rated VM/RTOS. AAOS can contribute a region (e.g. turn-by-turn navigation) through ClusterHomeService.", ["ASIL-B", "ClusterHome", "Tell-tales"]],
    ivi: ["Display", "Center Display (IVI)", "AAOS's main screen: Car Launcher, media, climate, settings. It is the <code>DISPLAY_TYPE_MAIN</code> of the driver's occupant zone.", ["DISPLAY_TYPE_MAIN", "Touch", "Rotary"]],
    pax: ["Display", "Passenger / Rear Seat Entertainment", "Screens for passengers. In Android 14 each one can run its own Android user (MUMD) with its own audio zone.", ["MUMD", "Occupant Zone"]],
    cam: ["Sensor", "Cameras & microphones", "Rear-view/360° cameras over MIPI CSI-2 into the SoC's ISP (Extended View System — EVS). Microphone arrays over A2B/TDM for voice assistants and noise cancellation.", ["EVS HAL", "A2B", "ISP"]],
    hyp: ["SoC", "Hypervisor", "Partitions the SoC into isolated virtual machines: one VM runs AAOS (IVI), another runs a real-time OS for the cluster. An Android failure does not take the cluster down.", ["Type-1 hypervisor", "Isolation", "virtio"]],
    aaos: ["SoC", "VM: Android Automotive OS 14", "Runs the whole stack: Apps → CarService → VHAL. The VHAL is a vendor process that sends/receives signals to the MCU over SPI/Ethernet.", ["CarService", "VHAL", "system/vendor"]],
    clustervm: ["SoC", "VM: Cluster OS", "QNX or real-time Linux renders the gauges. Boots in ~2 s, independently of Android.", ["QNX", "Fast boot"]],
    conn: ["SoC", "Connectivity", "5G modem (telematics, OTA), Wi-Fi/BT (phones, Android Auto projection), GNSS (positioning). Often a separate TCU module.", ["TCU", "OTA", "GNSS"]],
    mcu: ["MCU", "Vehicle MCU (safety island)", "Real-time microcontroller running AUTOSAR Classic. Controls SoC power, sends/receives CAN signals on Android's behalf and handles low-latency signals. Talks to the VHAL over an OEM-specific protocol.", ["AUTOSAR", "Power state", "Watchdog"]],
    gw: ["MCU", "Central Gateway", "Router between bus domains (body, powertrain, chassis, infotainment). Filters and firewalls traffic: infotainment may not send brake control frames.", ["Firewall", "Routing", "UN R155"]],
    can: ["Bus", "CAN / CAN FD", "The most common bus. Classic CAN ≤ 1 Mbit/s, 8 data bytes per frame. CAN FD: 2–8 Mbit/s data phase, up to 64 bytes per frame. Signals are described in DBC files.", ["DBC", "11/29-bit ID", "Arbitration"]],
    lin: ["Bus", "LIN", "Low-cost single-wire bus, ~19.2 kbit/s, master–slave. Used for seat motors, mirrors, ambient lighting, rain sensors.", ["Master/Slave", "Low cost"]],
    eth: ["Bus", "Automotive Ethernet", "100BASE-T1 / 1000BASE-T1 over a single twisted pair. High bandwidth for cameras, ADAS and zonal architectures. Service protocol SOME/IP, time sync via gPTP.", ["SOME/IP", "TSN", "Zonal"]],
    hvac: ["ECU", "HVAC ECU", "Controls the compressor, blower and blend doors. Receives the temperature setpoint over CAN and reports the actual state. It is the target of the Module 02 signal-flow trace.", ["Climate", "Blend door"]],
    bcm: ["ECU", "Body Control Module", "Doors, locks, lights, wipers, windows. Source of properties such as DOOR_LOCK and HEADLIGHTS_STATE.", ["Doors", "Lights"]],
    vcu: ["ECU", "VCU / ECM", "Engine/e-motor and transmission control. Source of PERF_VEHICLE_SPEED, GEAR_SELECTION, EV_BATTERY_LEVEL.", ["Powertrain", "Gear"]],
    adas: ["ECU", "ADAS", "Driver assistance: radar, cameras, lane keeping. Android 14 adds a family of ADAS properties (e.g. LANE_KEEP_ASSIST_ENABLED).", ["Radar", "Lane keep"]],
  };
  const panel = $("#deploy-info");
  function show(k) {
    const d = INFO[k];
    $$(".dp-item").forEach((b) => b.classList.toggle("sel", b.dataset.k === k));
    panel.innerHTML = `<div class="ip-kicker">${d[0]}</div><h4>${d[1]}</h4><p>${d[2]}</p><div class="chip-list">${d[3].map((t) => `<span class="chip">${t}</span>`).join("")}</div>
      <p class="small muted">💡 Click other blocks in the diagram to compare.</p>`;
  }
  $$(".dp-item").forEach((b) => b.addEventListener("click", () => show(b.dataset.k)));
  show("aaos");
})();
