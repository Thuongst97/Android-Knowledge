/* High-level architecture diagrams (layered bands) — Architecture 2.0 */
(function () {
  "use strict";
  const { $, Diagram: D } = window.AAOS;

  const BANDS = [
    { key: "apps", tag: "L1", title: ["Applications &", "UI Framework"], sub: ["/system_ext · /product"] },
    { key: "fw", tag: "L2", title: ["Android Framework", "& CarService"], sub: ["system_server"] },
    { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "Stable AIDL · VINTF isolation" },
    { key: "vendor", tag: "L4", title: ["Vendor Hardware", "Abstraction"], sub: ["/vendor · /odm"] },
    { key: "hw", tag: "L5", title: ["Vehicle Bus &", "Hardware"], sub: ["MCU · CAN-FD · ECUs"] },
  ];

  /* ---------- ① System architecture ---------- */
  D.layered($("#hd-overview"), {
    id: "arch", label: "AAOS 14 system architecture in five layers",
    bands: BANDS,
    nodes: [
      { id: "media", band: "apps", title: "Media · Dialer", sub: "reference apps", tag: "App" },
      { id: "launcher", band: "apps", title: "CarLauncher", sub: "home · app grid", tag: "App", tip: "CarLauncher — IVI home screen on the main display" },
      { id: "sysui", band: "apps", title: "CarSystemUI", sub: "bars · HVAC panel", tag: "App", tip: "CarSystemUI — system bars, notifications and the climate panel" },
      { id: "cluster", band: "apps", title: "Cluster app", sub: "ClusterHomeManager", tag: "App", tip: "Cluster app — draws navigation into the instrument cluster region" },
      { id: "third", band: "apps", title: "3rd-party apps", sub: "Car App Library", tag: "App", tip: "Car App Library — template-based apps that are safe while driving" },
      { id: "carlib", band: "apps", row: 1, at: [0.25, 1], title: "Car API — android.car", sub: "CarPropertyManager · CarAudioManager · CarPowerManager · CarOccupantZoneManager", tag: "API", tip: "android.car (car-lib) — managers linked into each app; thin Binder proxies to CarService" },

      { id: "sysserver", band: "fw", at: [0, 0.52], title: "system_server", sub: "ActivityManager · WindowManager · CarServiceHelperService", tag: "Svc" },
      { id: "sf", band: "fw", row: 1, at: [0, 0.165], title: "surfaceflinger", sub: "composition", tag: "Native", tip: "surfaceflinger — composes every display's layers" },
      { id: "audioserver", band: "fw", row: 1, at: [0.177, 0.342], title: "audioserver", sub: "AudioFlinger · Policy", tag: "Native", tip: "audioserver — AudioFlinger mixing + audio policy (dynamic per-zone routing)" },
      { id: "cpp", band: "fw", row: 1, at: [0.354, 0.52], title: "carpowerpolicyd", sub: "power policies", tag: "Native" },
      { id: "carservice", band: "fw", rows: 2, at: [0.56, 1], title: "CarService", sub: "com.android.car · persistent · updatable APEX", tag: "Svc", hl: true, tip: "CarService — all vehicle policy: properties & permissions, audio zones, power, occupants, users, UX restrictions" },

      { id: "composer", band: "vendor", at: [0, 0.165], title: "Composer HAL", sub: "displays", tag: "HAL" },
      { id: "audiohal", band: "vendor", at: [0.177, 0.342], title: "Audio HAL", sub: "+ IAudioControl", tag: "HAL" },
      { id: "evs", band: "vendor", at: [0.354, 0.52], title: "EVS HAL", sub: "rear-view cameras", tag: "HAL" },
      { id: "vhal", band: "vendor", at: [0.56, 0.78], title: "Vehicle HAL", sub: "IVehicle/default · C++", tag: "HAL", hl: true },
      { id: "remote", band: "vendor", at: [0.8, 1], title: "Remote Access HAL", sub: "IRemoteAccess · wake-up", tag: "HAL", tip: "IRemoteAccess (Android 14) — lets a remote server wake the car for tasks" },

      { id: "io", band: "hw", at: [0, 0.165], title: "Displays · cameras", sub: "SerDes · MIPI CSI", tag: "HW" },
      { id: "dsp", band: "hw", at: [0.177, 0.342], title: "Audio DSP", sub: "amplifiers · A2B", tag: "HW", tip: "Audio DSP / amplifiers — mix and route each zone's buses to speakers" },
      { id: "mcu", band: "hw", at: [0.56, 0.78], title: "Vehicle MCU", sub: "AUTOSAR · power owner", tag: "MCU" },
      { id: "gw", band: "hw", at: [0.8, 1], title: "Central gateway", sub: "routing · firewall", tag: "Bus", tip: "Central gateway — routes and filters frames between bus domains" },
      { id: "can", band: "hw", row: 1, at: [0.354, 0.52], title: "CAN-FD", sub: "body · HVAC · chassis", tag: "Bus" },
      { id: "eth", band: "hw", row: 1, at: [0.56, 0.78], title: "Automotive Ethernet", sub: "SOME/IP · ADAS", tag: "Bus" },
      { id: "ecus", band: "hw", row: 1, at: [0.8, 1], title: "ECUs", sub: "HVAC · BCM · VCU · ADAS", tag: "ECU" },
    ],
    edges: [
      { from: "launcher", to: "carlib", kind: "call" }, { from: "sysui", to: "carlib", kind: "call" },
      { from: "cluster", to: "carlib", kind: "call" }, { from: "media", to: "sysserver", kind: "ipc", label: "Binder" },
      { from: "carlib", to: "carservice", kind: "ipc", label: "Binder · ICarProperty" },
      { from: "sysserver", to: "carservice", kind: "ipc", label: "CarServiceHelper" },
      { from: "carservice", to: "cpp", kind: "ipc" },
      { from: "sf", to: "composer", kind: "ipc", label: "Composer AIDL" },
      { from: "audioserver", to: "audiohal", kind: "ipc", label: "Audio HAL AIDL" },
      { from: "carservice", to: "evs", kind: "ipc", label: "CarEvsService → EVS HAL" },
      { from: "carservice", to: "vhal", kind: "ipc", label: "IVehicle.setValues / subscribe", marker: "AIDL" },
      { from: "carservice", to: "remote", kind: "ipc", label: "IRemoteAccess" },
      { from: "composer", to: "io", kind: "hw", label: "SerDes" }, { from: "audiohal", to: "dsp", kind: "hw", label: "TDM / A2B" },
      { from: "vhal", to: "mcu", kind: "hw", label: "SPI · SocketCAN" },
      { from: "mcu", to: "gw", kind: "hw" }, { from: "gw", to: "ecus", kind: "hw" },
      { from: "mcu", to: "eth", kind: "hw" }, { from: "mcu", to: "can", kind: "hw" },
    ],
  });

  /* ---------- ② CarService internals ---------- */
  D.layered($("#hd-carservice"), {
    id: "csi", label: "CarService internals",
    bands: [
      { key: "apps", tag: "L1", title: ["Apps & plug-ins"], sub: ["car-lib managers", "/system_ext · /product"] },
      { key: "car", tag: "L2", title: ["CarService"], sub: ["com.android.car", "ICarImpl owns all services"] },
      { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "Stable AIDL · VINTF isolation" },
      { key: "vendor", tag: "L4", title: ["Vendor HALs"], sub: ["/vendor"] },
    ],
    nodes: [
      { id: "m-prop", band: "apps", at: [0, 0.19], title: "CarPropertyManager", sub: "properties", tag: "API" },
      { id: "m-pow", band: "apps", at: [0.2, 0.39], title: "CarPowerManager", sub: "power states", tag: "API" },
      { id: "m-user", band: "apps", at: [0.4, 0.59], title: "CarUserManager", sub: "users & profiles", tag: "API", tip: "CarUserManager — create / switch / remove / start users (system API)" },
      { id: "m-aud", band: "apps", at: [0.6, 0.77], title: "CarAudioManager", sub: "zones · volume", tag: "API" },
      { id: "plugins", band: "apps", at: [0.79, 1], title: "OEM plug-in apps", sub: "OemCarService · early-startup", tag: "Plug-in", tip: "OEM plug-in apps — privileged APKs started/bound by CarService (see OEM Extensibility)" },

      { id: "s-prop", band: "car", at: [0, 0.19], title: "CarPropertyService", sub: "permissions", tag: "Svc" },
      { id: "s-pow", band: "car", at: [0.2, 0.39], title: "CarPowerMgmtService", sub: "power state machine", tag: "Svc", tip: "CarPowerManagementService — runs the power state machine with the MCU" },
      { id: "s-user", band: "car", at: [0.4, 0.59], title: "CarUserService", sub: "User HAL orchestration", tag: "Svc" },
      { id: "s-aud", band: "car", at: [0.6, 0.77], title: "CarAudioService", sub: "zones · focus", tag: "Svc" },
      { id: "vsc", band: "car", at: [0.79, 1], title: "VendorServiceController", sub: "config_earlyStartupServices", tag: "Plug-in" },
      { id: "vhalc", band: "car", row: 1, at: [0, 0.59], title: "VehicleHal", sub: "single IVehicle client → PropertyHalService · PowerHalService · UserHalService · InputHalService", tag: "IPC", hl: true },
      { id: "oem", band: "car", row: 1, at: [0.79, 1], title: "CarOemProxyService", sub: "config_oemCarService", tag: "Policy" },

      { id: "vhal", band: "vendor", at: [0, 0.59], title: "Vehicle HAL", sub: "IVehicle/default · DefaultVehicleHal + IVehicleHardware", tag: "HAL", hl: true },
      { id: "actl", band: "vendor", at: [0.6, 0.77], title: "IAudioControl", sub: "focus · ducking · gain", tag: "HAL" },
    ],
    edges: [
      { from: "m-prop", to: "s-prop", kind: "ipc" }, { from: "m-pow", to: "s-pow", kind: "ipc" },
      { from: "m-user", to: "s-user", kind: "ipc" }, { from: "m-aud", to: "s-aud", kind: "ipc" },
      { from: "s-prop", to: "vhalc", kind: "call" }, { from: "s-pow", to: "vhalc", kind: "call" }, { from: "s-user", to: "vhalc", kind: "call" },
      { from: "vhalc", to: "vhal", kind: "ipc", label: "IVehicle (Binder)", marker: "AIDL" },
      { from: "s-aud", to: "actl", kind: "ipc", label: "IAudioControl", marker: "AIDL" },
      { from: "s-aud", to: "oem", kind: "call" },
      { from: "vsc", to: "plugins", kind: "opt", label: "bind / start" },
      { from: "oem", to: "plugins", kind: "opt", side: "right", label: "bind" },
    ],
  });

  /* ---------- ③ Partitions & processes ---------- */
  D.layered($("#hd-partitions"), {
    id: "parts", label: "Partitions and processes",
    bands: [
      { key: "product", tag: "L1", title: ["/system_ext", "/product"], sub: ["OEM apps & customizations"] },
      { key: "system", tag: "L2", title: ["/system"], sub: ["Google framework", "GSI-replaceable"] },
      { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "only stable AIDL / VINTF crosses" },
      { key: "vendor", tag: "L4", title: ["/vendor · /odm"], sub: ["SoC vendor + OEM", "hardware code"] },
      { key: "kernel", tag: "L5", title: ["Kernel &", "firmware"], sub: ["boot image · MCU"] },
    ],
    nodes: [
      { id: "p-launch", band: "product", title: "CarLauncher", sub: "home", tag: "App" },
      { id: "p-sysui", band: "product", title: "CarSystemUI", sub: "bars · HVAC", tag: "App" },
      { id: "p-priv", band: "product", title: "OEM priv-apps", sub: "/product/priv-app", tag: "App" },
      { id: "p-plug", band: "product", title: "Plug-ins", sub: "OemCarService · early-start", tag: "Plug-in" },
      { id: "p-rro", band: "product", title: "Product RROs", sub: "config & theme", tag: "Config", tip: "Runtime Resource Overlays — change resources of AOSP packages without code" },

      { id: "s-sm", band: "system", title: "servicemanager", sub: "Binder registry", tag: "Proc" },
      { id: "s-sf", band: "system", title: "surfaceflinger", sub: "composition", tag: "Proc" },
      { id: "s-aud", band: "system", title: "audioserver", sub: "AudioFlinger", tag: "Proc" },
      { id: "s-ss", band: "system", title: "system_server", sub: "framework services", tag: "Proc" },
      { id: "s-car", band: "system", title: "com.android.car", sub: "CarService · updatable", tag: "Proc", hl: true },

      { id: "v-vsm", band: "vendor", title: "vndservicemanager", sub: "vendor-only Binder", tag: "Proc" },
      { id: "v-cfg", band: "vendor", title: "Vendor configs", sub: "car_audio · power_policy", tag: "Config" },
      { id: "v-comp", band: "vendor", title: "Composer HAL", sub: "panels", tag: "HAL" },
      { id: "v-aud", band: "vendor", title: "Audio HAL", sub: "+ IAudioControl", tag: "HAL" },
      { id: "v-vhal", band: "vendor", title: "Vehicle HAL", sub: "IVehicle/default", tag: "HAL", hl: true },

      { id: "k-binder", band: "kernel", title: "Binder driver", sub: "/dev/binder · vndbinder", tag: "Kernel" },
      { id: "k-pm", band: "kernel", title: "Suspend / hibernate", sub: "/sys/power/state", tag: "Kernel" },
      { id: "k-av", band: "kernel", title: "DRM · ALSA · V4L2", sub: "display · audio · camera", tag: "Kernel" },
      { id: "k-can", band: "kernel", title: "SocketCAN · SPI", sub: "path to MCU / CAN", tag: "Kernel" },
      { id: "k-mcu", band: "kernel", title: "MCU firmware", sub: "AUTOSAR · outside Android", tag: "MCU", soft: true },
    ],
    edges: [
      { from: "p-priv", to: "s-car", kind: "ipc" }, { from: "p-plug", to: "s-car", kind: "opt", label: "bound by CarService" },
      { from: "p-rro", to: "s-car", kind: "opt", label: "overlays config.xml" },
      { from: "s-ss", to: "s-car", kind: "ipc" },
      { from: "s-car", to: "v-vhal", kind: "ipc", label: "IVehicle", marker: "AIDL" },
      { from: "s-aud", to: "v-aud", kind: "ipc", label: "Audio HAL", marker: "AIDL" },
      { from: "s-sf", to: "v-comp", kind: "ipc", label: "Composer", marker: "AIDL" },
      { from: "v-vhal", to: "k-can", kind: "hw" }, { from: "v-aud", to: "k-av", kind: "hw" }, { from: "v-comp", to: "k-av", kind: "hw" },
      { from: "v-vsm", to: "k-binder", kind: "call" }, { from: "k-can", to: "k-mcu", kind: "hw", label: "SPI / CAN" },
    ],
  });
})();
