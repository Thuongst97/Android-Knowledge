/* AAOS Platform Deep Dive — source map, feature map, boot sequence, CarService split, OEM extension map */
(function () {
  "use strict";
  const { $, esc, Diagram: D, SequenceDiagram } = window.AAOS;
  const CS = "https://cs.android.com/android/platform/superproject/main/+/main:";
  const L5 = (sub) => ({ key: "hw", tag: "L5", title: ["Kernel &", "product config"], sub });

  /* ---------- 11.1 Source map ---------- */
  D.layered($("#hd-source"), {
    id: "src", label: "Where AAOS lives in the AOSP source tree, by layer",
    bands: [
      { key: "apps", tag: "L1", title: ["Applications &", "car-lib"], sub: ["/product · /system_ext"] },
      { key: "fw", tag: "L2", title: ["Framework &", "CarService"], sub: ["/system · APEX"] },
      { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "Stable AIDL · VINTF" },
      { key: "vendor", tag: "L4", title: ["HAL interfaces &", "vendor code"], sub: ["/vendor · /odm"] },
      L5(["kernel · device/"]),
    ],
    nodes: [
      { id: "apps", band: "apps", span: 2, title: "packages/apps/Car/", sub: "Launcher · SystemUI · Settings · Media · Dialer · Notification", tag: "App", tip: "packages/apps/Car — the reference car apps (CarLauncher, CarSystemUI, Car Settings, Media, Dialer, Notification center)" },
      { id: "carlib", band: "apps", span: 2, title: "car-lib (android.car)", sub: "packages/services/Car/car-lib", tag: "API", tip: "car-lib — the android.car API: Car, CarPropertyManager, CarAudioManager… linked into every car app" },
      { id: "carui", band: "apps", title: "Car UI library", sub: "packages/apps/Car/libs", tag: "UI lib", tip: "car-ui-lib — themable UI components OEMs restyle with RROs or plugins" },

      { id: "fwbase", band: "fw", title: "frameworks/base", sub: "SystemServer · AMS · WMS", tag: "Svc", tip: "frameworks/base — SystemServer starts CarServiceHelperService on automotive devices" },
      { id: "builtin", band: "fw", title: "service-builtin", sub: "CarServiceHelperService", tag: "Svc", tip: "packages/services/Car/service-builtin — the builtin part that runs inside system_server" },
      { id: "service", band: "fw", span: 1.4, title: "service (CarService)", sub: "ICarImpl · Car*Service · updatable APEX", tag: "Svc", hl: true, tip: "packages/services/Car/service — the updatable CarService module (com.android.car.framework APEX)" },
      { id: "bltlib", band: "fw", title: "car-builtin-lib", sub: "hidden-API bridge", tag: "Svc", tip: "packages/services/Car/car-builtin-lib — lets the updatable module reach hidden framework APIs" },
      { id: "init", band: "fw", row: 1, at: [0, 0.3], title: "system/core/init", sub: "init · init.rc · ueventd", tag: "Native", tip: "system/core/init — the init process; system/core/rootdir holds init.rc" },
      { id: "cpp", band: "fw", row: 1, at: [0.64, 1], title: "packages/services/Car/cpp", sub: "carpowerpolicyd · carwatchdogd · evsmanagerd", tag: "Native", tip: "Native car daemons: power policy, watchdog, EVS manager and more" },

      { id: "hidl", band: "vendor", span: 1.6, title: "hardware/interfaces/automotive", sub: "vehicle · audiocontrol · evs · can · remoteaccess · occupant_awareness", tag: "HAL", hl: true, tip: "AIDL definitions of the automotive HALs (plus ivn_android_device and sv on recent branches)" },
      { id: "refimpl", band: "vendor", title: "VHAL reference impl", sub: "…/vehicle/aidl/impl", tag: "HAL", tip: "DefaultVehicleHal + FakeVehicleHardware — the AOSP reference VHAL the emulator uses" },
      { id: "oemdev", band: "vendor", title: "device/<oem>/<board>", sub: "HAL impls · overlays · .rc", tag: "Config", tip: "The OEM's device tree: IVehicleHardware, HAL services, init scripts, VINTF fragments, overlays" },

      { id: "product", band: "hw", title: "car_product", sub: "car.mk · overlays · sepolicy", tag: "Config", tip: "packages/services/Car/car_product — the AAOS product definition OEM products inherit" },
      { id: "gen", band: "hw", title: "device/generic/car", sub: "emulator & GSI products", tag: "Config", tip: "device/generic/car — reference car products for the emulator and GSI" },
      { id: "kernel", band: "hw", span: 1.4, title: "Kernel drivers", sub: "SocketCAN · SPI · DRM/KMS · ALSA · V4L2", tag: "Kernel" },
      { id: "mcu", band: "hw", title: "MCU firmware", sub: "outside AOSP · AUTOSAR", tag: "MCU", soft: true },
    ],
    edges: [
      { from: "apps", to: "carlib", kind: "call", label: "links" },
      { from: "carlib", to: "service", kind: "ipc", label: "Binder · ICar" },
      { from: "fwbase", to: "builtin", kind: "call" },
      { from: "builtin", to: "service", kind: "ipc" },
      { from: "service", to: "bltlib", kind: "call" },
      { from: "service", to: "hidl", kind: "ipc", label: "IVehicle", marker: "AIDL" },
      { from: "service", to: "cpp", kind: "ipc" },
      { from: "hidl", to: "refimpl", kind: "call", label: "implements" },
      { from: "refimpl", to: "oemdev", kind: "opt" },
      { from: "oemdev", to: "kernel", kind: "hw" },
      { from: "kernel", to: "mcu", kind: "hw" },
    ],
  });

  const SRC = [
    ["packages/services/Car/", "The car stack's main project: CarService, car-lib, native car daemons, product config, tests and tools.", "—"],
    ["packages/services/Car/car-lib/", "The <code>android.car</code> API apps use: <code>Car</code>, <code>CarPropertyManager</code>, <code>CarAudioManager</code>, <code>CarUserManager</code>…", "Library in each app process"],
    ["packages/services/Car/service/", "CarService: <code>ICarImpl</code> and every <code>Car*Service</code> (property, power, audio, user, occupant zone, input, UX restrictions…).", "Updatable APEX <code>com.android.car.framework</code>"],
    ["packages/services/Car/service-builtin/", "<code>CarServiceHelperService</code> and helpers that must run inside the platform.", "<code>system_server</code>"],
    ["packages/services/Car/car-builtin-lib/", "Bridge to hidden framework APIs for the updatable module.", "<code>/system</code>"],
    ["packages/services/Car/cpp/", "Native car services: power policy daemon, watchdog, EVS manager, telemetry and more.", "Native daemons on <code>/system</code>"],
    ["packages/services/Car/car_product/", "Product makefiles (<code>build/car.mk</code>), default overlays, init scripts and SELinux policy for AAOS builds.", "Build configuration"],
    ["packages/apps/Car/", "Reference car apps: Launcher, SystemUI, Settings, Media, Dialer, Notification; <code>libs/</code> holds the Car UI library.", "<code>/system_ext</code> · <code>/product</code>"],
    ["hardware/interfaces/automotive/", "AIDL HAL definitions: <code>vehicle</code>, <code>audiocontrol</code>, <code>evs</code>, <code>can</code>, <code>remoteaccess</code>, <code>occupant_awareness</code>…", "Interfaces frozen per release"],
    ["hardware/interfaces/automotive/vehicle/aidl/impl/", "Reference VHAL: <code>DefaultVehicleHal</code> plus <code>FakeVehicleHardware</code>.", "<code>/vendor</code> (emulator)"],
    ["device/generic/car/", "Car emulator and GSI products — the quickest way to run AAOS without hardware.", "Build configuration"],
    ["frameworks/base/services/java/com/android/server/SystemServer.java", "Starts the framework services and, on automotive devices, <code>CarServiceHelperService</code>.", "<code>system_server</code>"],
    ["system/core/rootdir/init.rc", "The root init script: boot triggers, core services, <code>zygote-start</code>.", "<code>init</code>"],
  ];
  $("#src-table").innerHTML = SRC.map(([p, what, runs]) =>
    `<tr><td><a class="mono" href="${CS + p}" target="_blank" rel="noopener">${esc(p).replace(/\//g, "/<wbr>")}</a></td><td>${what}</td><td>${runs}</td></tr>`).join("");

  /* ---------- 11.2 Feature map ---------- */
  const SA = "https://source.android.com/docs/automotive/";
  const FEAT = [
    ["🎛️", "Vehicle properties", "CarPropertyManager", "CarPropertyService → PropertyHalService", "VHAL (<code>IVehicle</code>)", "architecture.html#property-model", "2.6"],
    ["🔋", "Power &amp; Garage Mode", "CarPowerManager", "CarPowerManagementService · GarageModeService", "VHAL <code>AP_POWER_STATE_*</code> · carpowerpolicyd", "power.html#overview", "4.1"],
    ["🔊", "Multi-zone audio", "CarAudioManager", "CarAudioService", "<code>IAudioControl</code> · Audio HAL", "audio.html#concepts", "5.1"],
    ["🖥️", "Displays &amp; occupant zones", "CarOccupantZoneManager", "CarOccupantZoneService", "Display config · Composer HAL", "displays.html#occupant-zones", "6.2"],
    ["⌨️", "Input &amp; rotary", "CarInputManager", "CarInputService", "VHAL <code>HW_KEY_INPUT</code> · <code>HW_ROTARY_INPUT</code>", "displays.html#input-routing", "6.3"],
    ["👥", "Users &amp; profiles", "CarUserManager", "CarUserService", "User HAL (VHAL properties)", "users.html#architecture", "8.2"],
    ["🚦", "Driving restrictions", "CarUxRestrictionsManager", "CarUxRestrictionsManagerService", "VHAL gear · speed · parking brake", SA + "driver_distraction/car_uxr", "docs ↗"],
    ["📷", "Rear-view &amp; surround cameras", "CarEvsManager", "CarEvsService", "EVS HAL · evsmanagerd", "", ""],
    ["🧭", "Instrument cluster", "ClusterHomeManager", "ClusterHomeService", "VHAL cluster properties", SA + "displays/cluster_api", "docs ↗"],
    ["🩺", "System health", "CarWatchdogManager", "CarWatchdogService", "carwatchdogd", "", ""],
    ["📡", "Remote access &amp; wake-up", "CarRemoteAccessManager", "CarRemoteAccessService", "<code>IRemoteAccess</code> HAL", "power.html#power-policy", "4.5"],
  ];
  $("#feat-table").innerHTML = FEAT.map(([ic, name, api, svc, hal, href, lbl]) =>
    `<tr><td><span class="feat-ic">${ic}</span><b>${name}</b></td><td><code>${api}</code></td><td>${svc}</td><td>${hal}</td>` +
    `<td>${href ? `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${lbl}</a>` : "—"}</td></tr>`).join("");

  /* ---------- 11.3 Boot sequence ---------- */
  const lanes = [
    { title: "MCU & bootloader", sub: "outside Android", tone: "hw" },
    { title: "Kernel & init", sub: "PID 1 · *.rc", tone: "native" },
    { title: "Vendor HALs & daemons", sub: "VHAL · EVS · policy", tone: "hal" },
    { title: "system_server", sub: "framework services", tone: "fw" },
    { title: "CarService", sub: "com.android.car", tone: "fw" },
    { title: "Users & apps", sub: "launcher · plug-ins", tone: "app" },
  ];
  const steps = [
    { from: 0, to: 0, kind: "hw", svg: "wake → power SoC rails", label: "Unlock / door / ignition → MCU powers the SoC", title: "The MCU decides that Android starts",
      detail: "<p>The vehicle MCU is always powered from the 12 V battery. When the driver unlocks the car, opens a door or turns the ignition on, the MCU switches on the SoC's power rails. Android never decides on its own to boot.</p>", tags: [["Outside Android", "amber"]] },
    { from: 0, to: 1, kind: "hw", svg: "bootloader → kernel (AVB)", label: "Bootloader verifies and loads the kernel", title: "Bootloader and verified boot",
      detail: "<p>The bootloader initialises DRAM, verifies the boot images with <strong>Android Verified Boot</strong> and jumps into the kernel with its ramdisk. On many cars a splash screen — or even the rear camera — is already shown here by the bootloader or a separate RTOS.</p>" },
    { from: 1, to: 1, kind: "call", svg: "first stage: mount · SELinux", label: "First-stage init: mount partitions, load SELinux", title: "First-stage init",
      detail: "<p>The kernel starts <code>/init</code> as PID 1. Its first stage mounts <code>/system</code>, <code>/vendor</code> and the other partitions from the fstab, loads the SELinux policy, then re-executes itself as second-stage init.</p>" },
    { from: 1, to: 1, kind: "call", svg: "parse *.rc · servicemanagers", label: "Second stage: parse *.rc, run triggers, start service managers", title: "Second-stage init runs the boot triggers",
      detail: "<p>init reads <code>init.rc</code> and every <code>*.rc</code> under <code>/system/etc/init</code>, <code>/vendor/etc/init</code> and friends, then fires the boot triggers in order. Early on it starts <code>ueventd</code>, <code>logd</code> and the three Binder registries: <code>servicemanager</code>, <code>hwservicemanager</code> and <code>vndservicemanager</code>.</p>",
      code: "on late-init                    # system/core/rootdir/init.rc (abridged)\n    trigger early-fs\n    trigger fs\n    trigger post-fs\n    trigger late-fs\n    trigger post-fs-data\n    trigger zygote-start\n    trigger early-boot\n    trigger boot", codeLang: "conf", codeFile: "init.rc" },
    { from: 1, to: 2, kind: "call", svg: "start Vehicle HAL", label: "init starts the HAL services, including the Vehicle HAL", title: "The Vehicle HAL starts with the other HALs",
      detail: "<p>The VHAL is an ordinary init service on <code>/vendor</code>. It registers <code>IVehicle/default</code> with <code>servicemanager</code> so CarService can find it later. It starts long before the framework; some boards start it even earlier to buffer CAN data such as speed and gear.</p>",
      code: "service vendor.vehicle-hal-oem /vendor/bin/hw/android.hardware.automotive.vehicle-oem-service\n    class hal\n    user vehicle_network\n    group system inet", codeLang: "conf", codeFile: "vehicle-hal-oem.rc (example)", tags: [["Vendor", "purple"]] },
    { from: 2, to: 0, kind: "hw", svg: "open CAN / SPI link", label: "VHAL opens its link to the MCU; signals start flowing", title: "Vehicle signals start flowing",
      detail: "<p>The OEM's <code>IVehicleHardware</code> opens SocketCAN, SPI or Ethernet towards the MCU and starts receiving frames. From now on the VHAL can answer property reads and buffer events until a client subscribes.</p>", tags: [["Hardware link", "amber"]] },
    { from: 1, to: 2, kind: "call", svg: "carpowerpolicyd · carwatchdogd · evsmanagerd", label: "init starts the native car daemons", title: "Native car daemons",
      detail: "<p><code>carpowerpolicyd</code> applies the initial power policy (only what the first frame needs), <code>carwatchdogd</code> starts monitoring process health and I/O, and <code>evsmanagerd</code> makes the EVS cameras available — an early EVS app can show the rear camera before Android's UI exists.</p>" },
    { from: 1, to: 3, kind: "call", svg: "zygote → fork system_server", label: "zygote-start: Zygote preloads, then forks system_server", title: "Zygote and system_server",
      detail: "<p>On <code>zygote-start</code>, init launches Zygote. Zygote preloads classes and resources, then forks <code>system_server</code>, which starts the framework services in phases: bootstrap, core, then other services.</p>" },
    { from: 3, to: 3, kind: "call", svg: "FEATURE_AUTOMOTIVE → start helper", label: "startOtherServices(): automotive feature → CarServiceHelperService", title: "The automotive feature switches the car stack on",
      detail: "<p>The car product copies <code>car_core_hardware.xml</code>, which declares <code>android.hardware.type.automotive</code>. Only when <code>system_server</code> sees that feature does it start <code>CarServiceHelperService</code>; on a phone this branch is skipped.</p>",
      code: "// SystemServer.startOtherServices() — abridged\nif (mPackageManager.hasSystemFeature(PackageManager.FEATURE_AUTOMOTIVE)) {\n    t.traceBegin(\"StartCarServiceHelperService\");\n    mSystemServiceManager.startService(CAR_SERVICE_HELPER_SERVICE_CLASS);\n    t.traceEnd();\n}", codeLang: "java", codeFile: "SystemServer.java" },
    { from: 3, to: 4, kind: "ipc", svg: "bind CarService", label: "CarServiceHelperService binds CarService", title: "The helper binds CarService",
      detail: "<p>In <code>onStart()</code> the helper binds the CarService component by its interface action. Binding creates the CarService process, which stays running for the life of the system.</p>", tags: [["Binder", "blue"]] },
    { from: 4, to: 4, kind: "call", svg: "ICarImpl: create + init services", label: "onCreate(): build ICarImpl and initialise every car service", title: "ICarImpl creates and initialises the car services",
      detail: "<p>CarService's <code>onCreate()</code> connects to the VHAL and builds <code>ICarImpl</code>, the Binder root behind <code>ICar</code>. <code>ICarImpl.init()</code> initialises the services in dependency order: <code>VehicleHal</code> first, then property, power, user, audio, occupant zone and the rest.</p>",
      code: "// CarService (updatable) — abridged\nmICarImpl = new ICarImpl(/* context, vehicle stub, … */);\nmICarImpl.init();      // VehicleHal.init(), then each Car*Service.init()\n// onBind() returns mICarImpl → the helper and every app talk to it", codeLang: "java", codeFile: "CarServiceImpl.java" },
    { from: 4, to: 3, kind: "ipc", svg: "helper ⇄ ICarImpl", label: "Exchange binders with the helper", title: "Two-way link with system_server",
      detail: "<p>The helper receives <code>ICarImpl</code> from <code>onBind()</code> and hands its own binder back. CarService uses it to reach hidden framework APIs and to receive user lifecycle events (starting, switching, unlocking).</p>" },
    { from: 4, to: 2, kind: "ipc", svg: "IVehicle: configs · subscribe", label: "VehicleHal reads all property configs and subscribes", title: "CarService attaches to the Vehicle HAL",
      detail: "<p><code>VehicleHal</code> gets <code>IVehicle/default</code> from <code>servicemanager</code> (waiting if it is not up yet), reads every property configuration and subscribes to the properties its services need.</p>", tags: [["Stable AIDL", "amber"]] },
    { from: 4, to: 2, kind: "ipc", svg: "REPORT = WAIT_FOR_VHAL → ON", label: "Power handshake: WAIT_FOR_VHAL, then ON", title: "Power handshake with the vehicle",
      detail: "<p><code>CarPowerManagementService</code> reports <code>WAIT_FOR_VHAL</code>; when the MCU answers <code>AP_POWER_STATE_REQ = ON</code>, CPMS reports <code>ON</code> and the power policy daemon enables the remaining components.</p>",
      code: "AP_POWER_STATE_REPORT = WAIT_FOR_VHAL   // Android → vehicle\nAP_POWER_STATE_REQ    = ON              // vehicle → Android\nAP_POWER_STATE_REPORT = ON", codeLang: "conf", codeFile: "VHAL properties" },
    { from: 4, to: 2, kind: "ipc", svg: "INITIAL_USER_INFO", label: "CarUserService asks the User HAL which user to boot", title: "Choosing the driver's profile",
      detail: "<p><code>CarUserService</code> sends <code>INITIAL_USER_INFO</code> through the VHAL. The vehicle can answer \"boot user 11\" (for example from the key fob), \"create a new user\" or \"use the default\" — the last active user.</p>", tags: [["User HAL", "purple"]] },
    { from: 4, to: 3, kind: "ipc", svg: "start & switch to user 11", label: "Start and unlock the initial user on top of user 0", title: "The initial user starts",
      detail: "<p>The headless system user 0 is already running the system services. ActivityManager now starts and unlocks the chosen full user — the one that owns the driver's display — and passengers' users can follow on their own displays (MUMD).</p>" },
    { from: 4, to: 5, kind: "ipc", svg: "start early plug-ins", label: "VendorServiceController starts config_earlyStartupServices", title: "OEM plug-in services start",
      detail: "<p><code>VendorServiceController</code> reads <code>config_earlyStartupServices</code> and binds or starts each OEM service when its trigger fires (<code>asap</code>, <code>userUnlocked</code>…) for the right user.</p>", tags: [["OEM extension", "green"]] },
    { from: 3, to: 5, kind: "call", svg: "CarLauncher · CarSystemUI · BOOT_COMPLETED", label: "Home on the main display; BOOT_COMPLETED", title: "The car is ready",
      detail: "<p>CarSystemUI draws the system bars, CarLauncher appears on the driver's display and <code>BOOT_COMPLETED</code> is broadcast to the user's apps. Garage Mode, power policies and user switches now run on top of this state.</p>" },
  ];
  SequenceDiagram($("#boot-seq"), { lanes, steps, ariaLabel: "AAOS boot sequence from power-on to the launcher", laneW: 168, intro: "Follow an AAOS boot from the MCU waking the SoC to the launcher on the driver's display. Press <b>Next ▶</b> or <kbd>→</kbd>." });

  /* ---------- 11.5 CarService split ---------- */
  D.layered($("#hd-carservice-split"), {
    id: "csplit", label: "Builtin and updatable parts of CarService",
    bands: [
      { key: "apps", tag: "L1", title: ["App process"], sub: ["car-lib managers"] },
      { key: "sys", tag: "L2", title: ["/system"], sub: ["system_server", "native daemons"] },
      { key: "apex", tag: "APEX", tone: "fw", title: ["com.android.car", ".framework"], sub: ["updatable module", "own process"] },
      { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "Stable AIDL · VINTF" },
      { key: "vendor", tag: "L4", title: ["Vendor HALs"], sub: ["/vendor"] },
    ],
    nodes: [
      { id: "app", band: "apps", at: [0.58, 0.8], title: "Car API (car-lib)", sub: "Car.createCar() → getCarManager()", tag: "API" },
      { id: "ss", band: "sys", at: [0, 0.25], title: "SystemServer", sub: "FEATURE_AUTOMOTIVE check", tag: "Svc" },
      { id: "cshs", band: "sys", at: [0.29, 0.54], title: "CarServiceHelperService", sub: "service-builtin · car-builtin-lib", tag: "Svc", hl: true },
      { id: "daemons", band: "sys", at: [0.82, 1], title: "Native car daemons", sub: "carpowerpolicyd · carwatchdogd", tag: "Native" },
      { id: "impl", band: "apex", at: [0, 0.25], title: "CarServiceImpl", sub: "Service the helper binds", tag: "Svc" },
      { id: "icar", band: "apex", at: [0.58, 1], title: "ICarImpl", sub: "ICar Binder root · owns every service", tag: "Svc", hl: true },
      { id: "vsc", band: "apex", row: 1, at: [0.82, 1], title: "VendorServiceController", sub: "starts OEM plug-ins", tag: "Plug-in" },
      { id: "vhal", band: "apex", row: 1, at: [0, 0.25], title: "VehicleHal", sub: "the single IVehicle client", tag: "Svc" },
      { id: "svcs", band: "apex", row: 1, at: [0.29, 0.78], title: "Car*Service", sub: "Property · Power · Audio · User · OccupantZone · Input · UxRestrictions · Evs · Watchdog", tag: "Svc" },
      { id: "ivehicle", band: "vendor", at: [0, 0.25], title: "Vehicle HAL", sub: "IVehicle/default", tag: "HAL" },
      { id: "actl", band: "vendor", at: [0.29, 0.66], title: "Other car HALs", sub: "IAudioControl · EVS · IRemoteAccess", tag: "HAL" },
    ],
    edges: [
      { from: "ss", to: "cshs", kind: "call", label: "startService" },
      { from: "cshs", to: "impl", kind: "ipc", label: "bind" },
      { from: "impl", to: "icar", kind: "call", label: "new + init()" },
      { from: "icar", to: "vsc", kind: "call" },
      { from: "icar", to: "vhal", kind: "call" },
      { from: "icar", to: "svcs", kind: "call" },
      { from: "app", to: "icar", kind: "ipc", label: "ICar" },
      { from: "icar", to: "cshs", kind: "ipc", label: "ICarServiceHelper" },
      { from: "vhal", to: "ivehicle", kind: "ipc", label: "IVehicle", marker: "AIDL" },
      { from: "svcs", to: "actl", kind: "ipc", marker: "AIDL" },
    ],
  });

  /* ---------- 11.7 OEM extension map ---------- */
  D.layered($("#hd-oem"), {
    id: "oemx", label: "OEM extension points by layer",
    bands: [
      { key: "apps", tag: "L1", title: ["Applications &", "UI"], sub: ["/product · /system_ext"] },
      { key: "fw", tag: "L2", title: ["Framework &", "CarService"], sub: ["/system · APEX"] },
      { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "Stable AIDL · VINTF" },
      { key: "vendor", tag: "L4", title: ["Vendor"], sub: ["/vendor · /odm"] },
      L5(["kernel · MCU"]),
    ],
    nodes: [
      { id: "sysui", band: "apps", title: "CarSystemUI · CarLauncher", sub: "AOSP reference UI", tag: "App" },
      { id: "rro", band: "apps", title: "RRO overlays", sub: "colors · layouts · strings", tag: "Config" },
      { id: "carui", band: "apps", title: "Car UI library", sub: "themable components", tag: "UI lib" },
      { id: "cuiplug", band: "apps", title: "Car UI plugin", sub: "replace components at runtime", tag: "Plug-in" },
      { id: "oemapps", band: "apps", title: "OEM apps", sub: "privileged system apps", tag: "App" },

      { id: "cfg", band: "fw", title: "config.xml overlay", sub: "features · zones · plug-ins", tag: "Config" },
      { id: "cs", band: "fw", span: 1.3, title: "CarService", sub: "updatable — do not fork", tag: "Svc", hl: true },
      { id: "early", band: "fw", title: "Early-startup plug-ins", sub: "config_earlyStartupServices", tag: "Plug-in" },
      { id: "oemcs", band: "fw", title: "OemCarService", sub: "audio focus · volume policy", tag: "Policy", tone: "ext" },
      { id: "sysvc", band: "fw", title: "System service", sub: "platform change · last resort", tag: "Svc", tone: "ext", soft: true },

      { id: "vhal", band: "vendor", title: "Vehicle HAL", sub: "DefaultVehicleHal", tag: "HAL" },
      { id: "vprops", band: "vendor", title: "VENDOR properties", sub: "IVehicleHardware mapping", tag: "Config" },
      { id: "vaidl", band: "vendor", title: "Vendor AIDL HAL", sub: "+ VINTF fragment", tag: "HAL", tone: "ext" },
      { id: "vxml", band: "vendor", title: "Vendor XML", sub: "audio zones · power policy · displays", tag: "Config" },

      { id: "mcu", band: "hw", title: "MCU · ECUs", sub: "vehicle network", tag: "MCU" },
      { id: "kdrv", band: "hw", title: "Kernel drivers", sub: "CAN · SPI · DRM · ALSA", tag: "Kernel" },
    ],
    edges: [
      { from: "rro", to: "sysui", kind: "opt", label: "overlays" },
      { from: "cuiplug", to: "carui", kind: "opt" },
      { from: "cfg", to: "cs", kind: "opt" },
      { from: "cs", to: "early", kind: "opt", label: "binds" },
      { from: "cs", to: "oemcs", kind: "opt" },
      { from: "cs", to: "vhal", kind: "ipc", label: "IVehicle", marker: "AIDL" },
      { from: "vprops", to: "vhal", kind: "opt" },
      { from: "vhal", to: "mcu", kind: "hw" },
      { from: "vaidl", to: "kdrv", kind: "hw" },
    ],
  });
})();
