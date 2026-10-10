(function () {
  "use strict";
  const { $, $$, Diagram: D, SequenceDiagram } = window.AAOS;
  /* ------------------------- Extension points map ------------------------- */
  // Micro tags name the mechanism: [Config] RRO · [Plug-in] early-startup · [Policy] OemCarService
  // [App] persistent priv-app · [Fork] system_server service · [HAL] vendor · [UI lib] Car UI library
  D.layered($("#hd-ext"), {
    id: "ext", label: "OEM extension points across the AAOS stack",
    bands: [
      { key: "apps", tag: "L1", title: ["Applications &", "UI Framework"], sub: ["/system_ext · /product"] },
      { key: "fw", tag: "L2", title: ["Android Framework", "& CarService"], sub: ["system_server"] },
      { key: "treble", tag: "L3", treble: true, title: "Treble boundary", sub: "Stable AIDL · VINTF isolation" },
      { key: "vendor", tag: "L4", title: ["Vendor Hardware", "Abstraction"], sub: ["/vendor · /odm"] },
      { key: "hw", tag: "L5", title: ["Vehicle Bus &", "Hardware"], sub: ["MCU · CAN-FD · ECUs"] },
    ],
    nodes: [
      { id: "aosp", band: "apps", at: [0, 0.19], title: "CarLauncher · SystemUI", sub: "AOSP apps, restyled", tag: "App" },
      { id: "rro", band: "apps", at: [0.2, 0.39], title: "Product RROs", sub: "overlay resources", tag: "Config", hl: true, tip: "Runtime Resource Overlays — change values, mappings and theming of AOSP packages without code" },
      { id: "priv", band: "apps", at: [0.4, 0.59], title: "OEM priv-apps", sub: "android:persistent services", tag: "App", hl: true },
      { id: "plug", band: "apps", at: [0.6, 0.79], title: "Plug-in services", sub: "early-startup · OemCarService", tag: "Plug-in", hl: true },
      { id: "carui", band: "apps", at: [0.83, 1], title: "Car UI library", sub: "RRO tokens · plugin APK", tag: "UI lib", hl: true },

      { id: "ss", band: "fw", at: [0, 0.19], title: "system_server", sub: "framework services", tag: "Svc" },
      { id: "fork", band: "fw", at: [0, 0.19], row: 1, title: "Custom system service", sub: "fork · last resort", tag: "Fork", soft: true, tip: "Custom service inside system_server — powerful but must be rebased every Android release" },
      { id: "cfg", band: "fw", at: [0.2, 0.39], title: "CarService config.xml", sub: "overlayable resources", tag: "Config" },
      { id: "car", band: "fw", at: [0.4, 0.59], rows: 2, title: "CarService", sub: "com.android.car", tag: "Svc" },
      { id: "vsc", band: "fw", at: [0.6, 0.79], title: "VendorServiceController", sub: "early-startup list", tag: "Plug-in", tip: "VendorServiceController — starts and binds the services listed in config_earlyStartupServices" },
      { id: "oemp", band: "fw", at: [0.6, 0.79], row: 1, title: "CarOemProxyService", sub: "config_oemCarService", tag: "Policy" },

      { id: "vhal", band: "vendor", at: [0.4, 0.59], title: "Vehicle HAL", sub: "+ VENDOR-group properties", tag: "HAL", hl: true },
      { id: "vaidl", band: "vendor", at: [0.6, 0.79], title: "OEM vendor AIDL", sub: "@VintfStability service", tag: "HAL", hl: true },
      { id: "vcfg", band: "vendor", at: [0.83, 1], title: "Vendor configs & RROs", sub: "XML · overlays", tag: "Config", hl: true },
      { id: "mcu", band: "hw", at: [0.4, 0.79], title: "MCU · CAN-FD · ECUs", sub: "vehicle signals behind the VHAL", tag: "MCU" },
    ],
    edges: [
      { from: "rro", to: "cfg", kind: "opt", label: "overlays" },
      { from: "priv", to: "car", kind: "ipc" },
      { from: "vsc", to: "plug", kind: "opt", label: "bind / start" },
      { from: "oemp", to: "plug", kind: "opt", side: "right", label: "bind" },
      { from: "cfg", to: "car", kind: "call", label: "read at boot" },
      { from: "fork", to: "ss", kind: "call" },
      { from: "car", to: "vhal", kind: "ipc", label: "IVehicle", marker: "AIDL" },
      { from: "vhal", to: "mcu", kind: "hw" },
    ],
  });


  /* ------------------------- Decision helper ------------------------- */
  const CHOICES = [
    ["Change a value, mapping or the look", "Occupant zones, audio routing flag, enabled features, colors, layouts", "overlays", "[Config] Runtime Resource Overlay", "Create an RRO module targeting the package that owns the resource (CarService: <code>com.android.car.updatable</code>). No code, lowest upgrade cost."],
    ["Run OEM background logic tied to boot or user lifecycle", "Telemetry, connectivity bridge, OEM cloud sync", "plugin-services", "[Plug-in] CarService plug-in service", "Write a service in a privileged app and list it in <code>config_earlyStartupServices</code> with the right <code>user</code> and <code>trigger</code>. CarService starts, binds and re-binds it for you."],
    ["Change how AAOS decides audio focus, volume or ducking", "OEM-specific interruption rules", "oem-car-service", "[Policy] OemCarService", "Implement <code>OemCarService</code> with the policy components you need and point <code>config_oemCarService</code> at it. Unimplemented components keep AOSP defaults."],
    ["Expose a new vehicle signal to apps", "A CAN signal not covered by standard properties", "vendor-service", "[HAL] VHAL vendor property", "Add a <code>VENDOR</code>-group property to your VHAL and access it through <code>CarPropertyManager</code>. CarService keeps enforcing permissions."],
    ["Integrate new hardware that is not a vehicle signal", "DSP engine, proprietary sensor, streaming device", "vendor-service", "[HAL] Vendor AIDL service", "Define a <code>@VintfStability</code> AIDL interface, implement it on /vendor, declare it in VINTF and SEPolicy, and consume it from a privileged app or plug-in service."],
    ["Provide a new platform API used by many system components early in boot", "Rare — e.g. a device-wide policy engine", "system-service", "[Fork] System service in system_server (last resort)", "Add a <code>SystemService</code>, register it in <code>SystemServer</code> and <code>SystemServiceRegistry</code>, label it in SELinux. Budget for rebasing it every Android release."],
  ];
  const pick = $("#ext-pick"), answer = $("#ext-answer");
  pick.innerHTML = CHOICES.map((c, i) => `<button data-i="${i}"><b>${c[0]}</b><small>${c[1]}</small></button>`).join("");
  function choose(i) {
    const c = CHOICES[i];
    $$("button", pick).forEach((b) => b.classList.toggle("sel", +b.dataset.i === i));
    answer.innerHTML = `<h4>Recommended: ${c[3]}</h4><p class="small" style="margin:0 0 8px">${c[4]}</p><a class="small" href="#${c[2]}">Jump to the how-to →</a>`;
  }
  pick.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) choose(+b.dataset.i); });
  choose(1);

  /* ------------------------- Plug-in lifecycle sequence ------------------------- */
  const lanes = [
    { title: "VendorServiceController", sub: "inside CarService", tone: "fw" },
    { title: "CarUserService", sub: "user lifecycle events", tone: "fw" },
    { title: "ActivityManager", sub: "system_server", tone: "fw" },
    { title: "OEM plug-in app", sub: "com.oem.car.telemetry", tone: "ext" },
    { title: "CarService APIs", sub: "Car / managers", tone: "app" },
  ];
  const steps = [
    { from: 0, to: 0, svg: "parse config_earlyStartupServices", label: "Read config_earlyStartupServices", title: "Parse the plug-in list", detail: "<p>During CarService initialization, <code>VendorServiceController</code> reads the <code>config_earlyStartupServices</code> string array (possibly overridden by your RRO) and builds one entry per service: component, bind mode, target user and trigger.</p>", code: "com.oem.car.telemetry/.TelemetryService#bind=bind,user=system,trigger=asap", codeLang: "conf", tags: [["CarService", "purple"]] },
    { from: 0, to: 2, kind: "ipc", svg: "bindServiceAsUser(user 0)", label: "bindServiceAsUser(TelemetryService, user 0)", title: "Start system-user services (trigger=asap)", detail: "<p>Entries with <code>user=system</code> and <code>trigger=asap</code> are bound immediately as the headless system user (user 0), before any driver user is unlocked.</p>", tags: [["Binder IPC", "purple"]] },
    { from: 2, to: 3, kind: "call", svg: "fork · onCreate() · onBind()", label: "Start process → onCreate() → onBind()", title: "ActivityManager launches the plug-in", detail: "<p>ActivityManager forks the app process (if not running), instantiates the service and calls <code>onCreate()</code> then <code>onBind()</code>. With <code>bind=bind</code>, returning a non-null <code>IBinder</code> completes the connection.</p>", analogy: "Like a building manager turning on the contractor's equipment as soon as the power comes back — no tenant has arrived yet." },
    { from: 3, to: 4, kind: "ipc", svg: "Car.createCar() → managers", label: "Car.createCar() → CarPropertyManager", title: "The plug-in uses Car APIs", detail: "<p>The plug-in is an ordinary (privileged) client: it connects to CarService and uses managers, subject to the same permission checks as any other app.</p>", tags: [["Permission-checked", "red"]] },
    { from: 1, to: 0, kind: "ret", svg: "USER_UNLOCKED (user 10)", label: "User lifecycle event: user 10 unlocked", title: "Driver user unlocked", detail: "<p><code>CarUserService</code> notifies listeners of user lifecycle events. When the driver's user 10 is unlocked, entries with <code>user=foreground</code> and <code>trigger=userUnlocked</code> become eligible.</p>" },
    { from: 0, to: 2, kind: "ipc", svg: "bindServiceAsUser(user 10)", label: "bindServiceAsUser(AssistantBridgeService, user 10)", title: "Start per-user services", detail: "<p>Per-user plug-ins are bound as the foreground user so they can access that user's credential-encrypted data and accounts.</p>", tags: [["Binder IPC", "purple"]] },
    { from: 2, to: 3, kind: "call", svg: "onCreate() · onBind() (user 10)", label: "onCreate() → onBind() as user 10", title: "Second instance, different user", detail: "<p>The same APK may now run in two processes: one for user 0, one for user 10. Design services to be user-aware.</p>" },
    { from: 3, to: 0, kind: "ret", svg: "binderDied / onServiceDisconnected", label: "Process crash → onServiceDisconnected()", title: "Crash detected", detail: "<p>If the plug-in process dies, the binding reports disconnection. For <code>bind=bind</code> entries, the controller re-binds (with back-off) so the service comes back automatically.</p>", tags: [["Resilience", "amber"]] },
    { from: 0, to: 2, kind: "ipc", svg: "re-bind", label: "Re-bind the service", title: "Automatic recovery", detail: "<p>The service is restarted without OEM code having to watch it — one of the main benefits over starting services manually from a BOOT_COMPLETED receiver.</p>" },
    { from: 1, to: 0, kind: "ret", svg: "user switch 10 → 11", label: "User switch: 10 → 11", title: "User switch", detail: "<p>On a user switch, <code>user=foreground</code> services are unbound from the old user and bound for the new one. <code>user=system</code> services keep running untouched.</p>", analogy: "A hotel concierge assigned to “the guest currently at the desk” changes when the next guest steps up; the building's boiler technician stays on duty regardless." },
  ];
  SequenceDiagram($("#plugin-seq"), { lanes, steps, ariaLabel: "CarService plug-in service lifecycle", laneW: 196, intro: "Follow how CarService starts, supervises and re-binds OEM plug-in services. Press <b>Next ▶</b> or <kbd>→</kbd>." });
})();
