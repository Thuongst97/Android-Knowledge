(function () {
  "use strict";
  const { $, $$, Diagram: D, SequenceDiagram } = window.AAOS;
  const BLUE = "#70cff8", PURPLE = "#a78bfa", GREEN = "#34d399", GRAY = "#94a3b8";

  /* ------------------------- Extension points map ------------------------- */
  (function () {
    let s = D.defs("ex");
    // Applications
    s += D.box(20, 14, 960, 84, { c: BLUE, title: "Applications (/system_ext · /product)" });
    const appX = 36, appW = 928, gap = 10, bw = (appW - gap * 3) / 4;
    const apps = [
      ["CarLauncher · CarSystemUI", "AOSP apps, restyled", 1],
      ["OEM privileged apps", "android:persistent services", 4],
      ["Plug-in services · OemCarService", "started/bound by CarService", 2],
      ["Car UI library", "shared look across apps", 7],
    ];
    apps.forEach((a, i) => {
      const x = appX + i * (bw + gap);
      s += D.box(x, 44, bw, 42, { c: i === 2 ? GREEN : BLUE, title: a[0], sub: a[1], titleY: 17, soft: i === 2 });
      s += D.pin(x + bw - 8, 44, a[2]);
    });
    const plugBoxX = appX + 2 * (bw + gap), plugCx = plugBoxX + bw / 2;

    // Framework
    s += D.box(20, 118, 360, 150, { c: BLUE, title: "system_server — Android framework" });
    s += D.chips(32, 146, 336, ["ActivityManager", "PackageManager", "WindowManager", "AudioService"]).svg;
    s += D.box(32, 206, 336, 48, { c: GREEN, soft: true, title: "Custom OEM system service", sub: "framework fork — last resort", titleY: 20 });
    s += D.pin(360, 206, 5);

    s += D.box(400, 118, 580, 150, { c: PURPLE, title: "CarService — com.android.car" });
    const cw = (556 - 10) / 2;
    s += D.box(412, 146, cw, 44, { c: GREEN, title: "VendorServiceController", sub: "config_earlyStartupServices", titleY: 18 });
    s += D.pin(412 + cw - 8, 146, 2);
    s += D.box(422 + cw, 146, cw, 44, { c: GREEN, title: "CarOemProxyService", sub: "config_oemCarService", titleY: 18 });
    s += D.pin(422 + cw + cw - 8, 146, 3);
    s += D.box(412, 202, cw, 52, { c: PURPLE, title: "config.xml resources", sub: "zones · features · plug-in lists", titleY: 22 });
    s += D.pin(412 + cw - 8, 202, 1);
    s += D.box(422 + cw, 202, cw, 52, { c: PURPLE, title: "VehicleHal", sub: "single IVehicle client", titleY: 22 });

    // plug arrows: controller/proxy → plug-in apps box
    s += D.arrow(`M${412 + cw / 2},146 V112 H${plugCx - 20} V87`, "plug", "ex");
    s += D.arrow(`M${422 + cw + cw / 2},146 V106 H${plugCx + 20} V87`, "plug", "ex");

    // Treble line
    s += `<line class="hd-line" x1="20" y1="284" x2="980" y2="284"/>` + D.note(980, 280, "Treble boundary — stable AIDL / VINTF", "end");

    // Vendor
    s += D.box(20, 296, 960, 84, { c: GREEN, title: "/vendor — hardware-facing code" });
    const vend = [["Vehicle HAL", "+ VENDOR-group properties", 6], ["OEM vendor AIDL service", "@VintfStability", 6], ["Vendor config XMLs", "car_audio · power_policy", 1], ["Vendor RROs", "device-specific overlays", 1]];
    vend.forEach((v, i) => {
      const x = appX + i * (bw + gap);
      s += D.box(x, 326, bw, 42, { c: GREEN, title: v[0], sub: v[1], titleY: 17, soft: i === 1 });
      s += D.pin(x + bw - 8, 326, v[2]);
    });
    s += D.arrow(`M${422 + cw + cw / 2},254 V325`, "ipc", "ex");

    s += D.box(20, 396, 960, 44, { c: GRAY, title: "MCU · CAN / LIN / Ethernet · ECUs", center: true, titleY: 27 });
    $("#hd-ext").innerHTML = D.svg(1000, 452, s, "OEM extension points map");
  })();

  /* ------------------------- Decision helper ------------------------- */
  const CHOICES = [
    ["Change a value, mapping or the look", "Occupant zones, audio routing flag, enabled features, colors, layouts", "overlays", "① Runtime Resource Overlay", "Create an RRO module targeting the package that owns the resource (CarService: <code>com.android.car.updatable</code>). No code, lowest upgrade cost."],
    ["Run OEM background logic tied to boot or user lifecycle", "Telemetry, connectivity bridge, OEM cloud sync", "plugin-services", "② CarService plug-in service", "Write a service in a privileged app and list it in <code>config_earlyStartupServices</code> with the right <code>user</code> and <code>trigger</code>. CarService starts, binds and re-binds it for you."],
    ["Change how AAOS decides audio focus, volume or ducking", "OEM-specific interruption rules", "oem-car-service", "③ OemCarService", "Implement <code>OemCarService</code> with the policy components you need and point <code>config_oemCarService</code> at it. Unimplemented components keep AOSP defaults."],
    ["Expose a new vehicle signal to apps", "A CAN signal not covered by standard properties", "vendor-service", "⑥ VHAL vendor property", "Add a <code>VENDOR</code>-group property to your VHAL and access it through <code>CarPropertyManager</code>. CarService keeps enforcing permissions."],
    ["Integrate new hardware that is not a vehicle signal", "DSP engine, proprietary sensor, streaming device", "vendor-service", "⑥ Vendor AIDL service", "Define a <code>@VintfStability</code> AIDL interface, implement it on /vendor, declare it in VINTF and SEPolicy, and consume it from a privileged app or plug-in service."],
    ["Provide a new platform API used by many system components early in boot", "Rare — e.g. a device-wide policy engine", "system-service", "⑤ System service in system_server (last resort)", "Add a <code>SystemService</code>, register it in <code>SystemServer</code> and <code>SystemServiceRegistry</code>, label it in SELinux. Budget for rebasing it every Android release."],
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
    { title: "VendorServiceController", sub: "inside CarService" },
    { title: "CarUserService", sub: "user lifecycle events" },
    { title: "ActivityManager", sub: "system_server" },
    { title: "OEM plug-in app", sub: "com.oem.car.telemetry" },
    { title: "CarService APIs", sub: "Car / managers" },
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
