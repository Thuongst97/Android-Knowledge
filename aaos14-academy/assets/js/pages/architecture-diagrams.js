/* =================== High-level architecture diagrams =================== */
(function () {
  "use strict";
  const { $, Diagram: D } = window.AAOS;
  const BLUE = "#70cff8", PURPLE = "#a78bfa", GREEN = "#34d399", AMBER = "#fbbf24", GRAY = "#94a3b8", PINK = "#f472b6";

  /* ---------- ① System overview ---------- */
  (function () {
    let s = D.defs("ov");
    const band = (y, h, c, label) => `<rect class="hd-band" style="--c:${c}" x="0" y="${y}" width="124" height="${h}" rx="8"/>` + D.label(12, y + h / 2 + 4, label);
    s += band(10, 62, BLUE, "APPLICATIONS") + band(78, 64, PURPLE, "CAR API") + band(148, 182, BLUE, "FRAMEWORK")
       + band(346, 64, GREEN, "HALs (/vendor)") + band(416, 48, AMBER, "KERNEL") + band(472, 108, GRAY, "HARDWARE");

    s += D.row(130, 14, 860, 56, [
      { title: "Car Launcher", sub: "home · app grid", c: BLUE, tip: "IVI home screen running on the main display" },
      { title: "HVAC / SystemUI", sub: "CarSystemUI", c: BLUE, tip: "Climate panel and car system bars" },
      { title: "Media Center", sub: "MediaBrowser apps", c: BLUE },
      { title: "Dialer · Settings", sub: "system apps", c: BLUE },
      { title: "Cluster app", sub: "ClusterHome", c: BLUE, tip: "Draws navigation into the instrument cluster region" },
      { title: "3rd-party apps", sub: "Car App Library", c: BLUE, tip: "Template-based apps safe for driving" },
    ]);

    s += D.box(130, 80, 860, 58, { c: PURPLE, title: "Car API — android.car library (linked into every car-aware app)", tip: "Managers are thin proxies to CarService over Binder" });
    s += D.chips(142, 108, 840, ["CarPropertyManager", "CarAudioManager", "CarPowerManager", "CarOccupantZoneManager", "CarUxRestrictionsManager", "CarInputManager"]).svg;

    s += D.arrow("M335,138 V151", "ipc", "ov") + D.arrow("M770,138 V151", "ipc", "ov");

    s += D.box(130, 152, 410, 118, { c: BLUE, title: "Android framework — system_server", tip: "The standard Android system services, unchanged in AAOS" });
    s += D.chips(142, 180, 390, ["ActivityManager", "WindowManager", "PackageManager", "InputManager", "AudioService", "DisplayManager", "JobScheduler", "PowerManager", "CarServiceHelperService"]).svg;
    s += D.box(550, 152, 440, 118, { c: PURPLE, title: "CarService — com.android.car (persistent, updatable)", tip: "All vehicle policy: properties, audio zones, power, occupants, UX restrictions" });
    s += D.chips(562, 180, 420, ["CarPropertyService", "CarAudioService", "CarPowerManagementService", "CarOccupantZoneService", "CarInputService", "CarUxRestrictionsService", "CarUserService", "ClusterHomeService"]).svg;

    s += D.row(130, 282, 860, 44, [
      { title: "audioserver", sub: "AudioFlinger · Policy", c: BLUE },
      { title: "surfaceflinger", sub: "composition", c: BLUE },
      { title: "carpowerpolicyd", sub: "power policies", c: PURPLE },
      { title: "carwatchdogd", sub: "health · I/O", c: PURPLE },
      { title: "evsmanagerd", sub: "rear-view camera", c: PURPLE },
      { title: "servicemanager", sub: "Binder registry", c: BLUE },
    ]);

    s += `<line class="hd-line" x1="130" y1="339" x2="990" y2="339"/>` + D.note(990, 335, "Stable AIDL + VINTF — Treble boundary (/system ⇅ /vendor)", "end");

    s += D.row(130, 350, 860, 56, [
      { title: "Vehicle HAL", sub: "IVehicle", c: GREEN, tip: "Translates Vehicle Properties ⇄ CAN/LIN/Ethernet signals" },
      { title: "Audio HAL", sub: "+ IAudioControl", c: GREEN, tip: "PCM to the DSP; AudioControl carries focus/ducking/gain signals" },
      { title: "EVS HAL", sub: "IEvsEnumerator", c: GREEN, tip: "Fast camera path for rear-view/surround view" },
      { title: "Composer HAL", sub: "displays", c: GREEN },
      { title: "Remote Access", sub: "IRemoteAccess", c: GREEN, tip: "Android 14: wake the AP for remote tasks" },
      { title: "Other HALs", sub: "BT · Wi-Fi · GNSS", c: GREEN },
    ]);
    s += D.arrow("M570,270 V277 H122 V378 H129", "ipc", "ov");

    s += D.row(130, 420, 860, 40, [
      { title: "SocketCAN · SPI", c: AMBER }, { title: "Binder driver", c: AMBER }, { title: "DRM / KMS", c: AMBER },
      { title: "ALSA / TDM", c: AMBER }, { title: "V4L2", c: AMBER }, { title: "Suspend / PM", c: AMBER },
    ]);
    s += D.arrow("M197,406 V419", "", "ov");

    s += D.box(130, 476, 420, 100, { c: GRAY, title: "SoC — CPU · GPU · NPU · ISP (often split by a hypervisor)" });
    s += D.chips(142, 504, 400, ["Displays via SerDes", "Touch controllers", "Cameras (MIPI CSI)", "Mic array (A2B)", "Modem / TCU", "Storage (UFS)"]).svg;
    s += D.box(560, 476, 430, 100, { c: GRAY, title: "Vehicle MCU + in-vehicle network" });
    s += D.chips(572, 504, 410, ["AUTOSAR MCU", "Central gateway", "CAN FD", "LIN", "Automotive Ethernet", "ECUs: HVAC · BCM · VCU · ADAS"]).svg;
    s += D.arrow("M197,460 V468 H700 V475", "", "ov");

    $("#hd-overview").innerHTML = D.svg(1000, 590, s, "AAOS system overview diagram");
  })();

  /* ---------- ② CarService internals ---------- */
  (function () {
    let s = D.defs("cs");
    s += D.box(20, 14, 960, 58, { c: BLUE, title: "App processes — car-lib managers (Car.createCar → getCarManager)" });
    s += D.chips(32, 40, 930, ["CarPropertyManager", "CarAudioManager", "CarPowerManager", "CarOccupantZoneManager", "CarUxRestrictionsManager", "CarUserManager", "ClusterHomeManager"]).svg;
    s += D.arrow("M600,72 V103", "ipc", "cs") + D.note(610, 92, "ICar · ICarProperty · ICarAudio … (Binder)");

    s += D.box(20, 104, 200, 110, { c: BLUE, title: "system_server", sub: "CarServiceHelperService", tip: "Forwards boot phases and user lifecycle events to CarService" });
    s += D.chips(32, 150, 180, ["boot phases", "user lifecycle", "display hooks"]).svg;
    s += D.arrow("M220,160 H249", "ipc", "cs");

    s += D.box(250, 104, 730, 330, { c: PURPLE, title: "CarService process — com.android.car", sub: "ICarImpl creates, initializes and owns every car service" });
    const cols = [266, 502, 738], rows = [148, 196, 244], bw = 226;
    const svcs = [
      ["CarPropertyService", "properties + permissions"], ["CarAudioService", "zones · focus · volume"], ["CarPowerManagementService", "power states · policies"],
      ["CarOccupantZoneService", "occupants ↔ displays ↔ users"], ["CarInputService", "steering keys · rotary"], ["CarUxRestrictionsService", "driver-distraction rules"],
      ["CarDrivingStateService", "parked · idling · moving"], ["CarUserService", "user lifecycle ↔ User HAL"], ["ClusterHomeService", "cluster activity & state"],
    ];
    svcs.forEach((v, i) => { s += D.box(cols[i % 3], rows[Math.floor(i / 3)], bw, 40, { c: PURPLE, title: v[0], sub: v[1], titleY: 16, tip: v[1] }); });

    s += D.box(266, 296, 340, 40, { c: GREEN, title: "VendorServiceController", sub: "starts config_earlyStartupServices", titleY: 16, tip: "Starts/binds OEM plug-in services per user and trigger" });
    s += D.box(618, 296, 346, 40, { c: GREEN, title: "CarOemProxyService", sub: "binds OemCarService (config_oemCarService)", titleY: 16, tip: "Android 14: delegates audio policy decisions to an OEM service" });

    s += D.box(266, 348, 698, 72, { c: PINK, title: "VehicleHal — the single IVehicle client, fanned out to per-domain HAL services" });
    s += D.chips(278, 374, 674, ["PropertyHalService", "PowerHalService", "InputHalService", "UserHalService", "ClusterHalService", "EvsHalService"]).svg;

    s += D.box(266, 470, 330, 56, { c: GREEN, title: "Vehicle HAL (IVehicle)", sub: "/vendor · C++", center: true, titleY: 24 });
    s += D.box(610, 470, 170, 56, { c: GREEN, title: "IAudioControl", sub: "audio HAL side", center: true, titleY: 24 });
    s += D.box(794, 470, 170, 56, { c: PURPLE, title: "carpowerpolicyd", sub: "native daemon", center: true, titleY: 24 });
    s += D.arrow("M430,420 V469", "ipc", "cs") + D.arrow("M695,434 V469", "ipc", "cs") + D.arrow("M879,434 V469", "ipc", "cs");

    s += D.box(20, 296, 200, 138, { c: GREEN, soft: true, title: "OEM plug-in apps", sub: "privileged APKs" });
    s += D.chips(32, 342, 180, ["early-startup services", "OemCarService impl", "persistent priv-apps"]).svg;
    s += D.arrow("M266,312 H223", "plug", "cs") + D.arrow("M790,336 V342 H223", "plug", "cs");

    $("#hd-carservice").innerHTML = D.svg(1000, 540, s, "CarService internals diagram");
  })();

  /* ---------- ③ Partitions & processes ---------- */
  (function () {
    let s = D.defs("pp");
    const col = (x, w, c, title, sub, items) => {
      let out = D.box(x, 14, w, 380, { c, soft: true, title, sub });
      items.forEach((it, i) => { out += D.box(x + 10, 60 + i * 44, w - 20, 36, { c: it[2] || c, title: it[0], sub: it[1], titleY: 15, soft: !!it[3] }); });
      return out;
    };
    s += col(20, 230, BLUE, "/system", "Google framework", [
      ["system_server", "framework services"], ["com.android.car", "CarService · updatable", PURPLE], ["audioserver", "AudioFlinger · AudioPolicy"],
      ["surfaceflinger", "composition"], ["carpowerpolicyd · carwatchdogd", "car native daemons", PURPLE], ["servicemanager", "Binder service registry"], ["framework-res · car-lib", "resources & APIs"],
    ]);
    s += col(262, 230, "#7dd3fc", "/system_ext · /product", "OEM apps & customizations", [
      ["CarLauncher", "home screen"], ["CarSystemUI", "bars · HVAC · notifications"], ["Settings · Dialer · Media", "reference system apps"],
      ["OEM privileged apps", "/product/priv-app"], ["OemCarService app", "Android 14 policy plug-in", GREEN], ["Early-startup services", "CarService plug-ins", GREEN], ["Product RROs", "config & theme overlays", GREEN],
    ]);
    s += `<line class="hd-line" x1="505" y1="10" x2="505" y2="398"/>` + D.note(505, 414, "Treble boundary — only stable AIDL / VINTF interfaces cross", "middle");
    s += col(518, 230, GREEN, "/vendor · /odm", "SoC vendor + OEM hardware code", [
      ["Vehicle HAL service", "IVehicle/default"], ["Audio HAL + IAudioControl", "DSP / amplifier path"], ["EVS HAL", "camera fast path"],
      ["Composer / Display HAL", "panels & SerDes"], ["vndservicemanager", "vendor-only Binder"], ["Vendor config XMLs", "car_audio · power_policy"], ["OEM vendor AIDL services", "custom hardware", GREEN, true],
    ]);
    s += col(760, 220, AMBER, "Kernel & firmware", "boot image · MCU", [
      ["Binder driver", "IPC for every hop"], ["SocketCAN · SPI drivers", "path to the MCU / CAN"], ["DRM/KMS · ALSA · V4L2", "display · audio · camera"],
      ["Suspend / hibernation", "/sys/power/state"], ["MCU firmware", "AUTOSAR — outside Android", GRAY, true],
    ]);
    $("#hd-partitions").innerHTML = D.svg(1000, 425, s, "Partitions and processes diagram");
  })();
})();
