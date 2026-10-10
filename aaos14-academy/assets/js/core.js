/* =========================================================================
   AAOS 14 Academy — core runtime
   Shared layout (header, sidebar, pager, footer), global search, scrollspy,
   tabs, syntax highlighter, annotated code viewer and sequence-diagram engine.
   ========================================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------------ Site map */
  const SITE = [
    {
      id: "foundations", file: "foundations.html", num: "01", group: "Foundations",
      title: "Foundational Concepts & Ecosystem", short: "Foundations & Ecosystem", icon: "🧭", accent: "#70cff8",
      desc: "Android Auto vs AAOS vs phone AOSP, and the real hardware: SoC, MCU, CAN/LIN, displays.",
      sections: [
        ["ecosystem", "Three Android ecosystems in the car", "android auto projection aaos standalone"],
        ["matrix", "Comparison matrix", "compare matrix gas play store"],
        ["deployment", "Real-world deployment architecture", "soc mcu can lin ethernet display hypervisor serializer"],
        ["takeaways", "Key takeaways", "summary"],
      ],
    },
    {
      id: "architecture", file: "architecture.html", num: "02", group: "Foundations",
      title: "The 5-Layer AAOS 14 Architecture", short: "5-Layer Architecture", icon: "🏗️", accent: "#a78bfa",
      desc: "From App → Car API → AIDL → VHAL → MCU & Vehicle Bus.",
      sections: [
        ["diagrams", "High-level architecture diagrams", "diagram overview carservice internals partitions processes block"],
        ["overview", "Five layers at a glance", "stack layer"],
        ["signal-flow", "End-to-end signal flow (HVAC)", "hvac signal flow setfloatproperty setvalues can frame ecu"],
        ["explorer", "Layer explorer", "carservice carpropertymanager ivehicle vhal mcu"],
        ["treble", "Treble boundary & VINTF", "treble vintf system vendor partition stable aidl"],
        ["property-model", "The Vehicle Property model", "property id area access change mode 0x15600503"],
      ],
    },
    {
      id: "fundamentals", file: "fundamentals.html", num: "02.5", group: "Foundations",
      title: "Core Android Techniques", short: "Core Android Techniques", icon: "⚙️", accent: "#34d399",
      desc: "Binder IPC, Handler/Looper/MessageQueue, threading rules, Zygote & process model, components, system properties.",
      sections: [
        ["anatomy", "Anatomy of a process", "process threads main thread binder thread pool"],
        ["binder", "Binder IPC", "binder ipc proxy stub parcel servicemanager transact oneway linktodeath getcallinguid"],
        ["looper", "Handler, Looper & MessageQueue", "handler looper messagequeue handlerthread postdelayed anr uptime"],
        ["threading", "Threading rules for AAOS code", "threading deadlock main thread callbacks executor"],
        ["process", "Init, Zygote & system_server", "init zygote system_server lmkd boot"],
        ["components", "App components & IPC patterns", "activity service bound started broadcast contentprovider intent"],
        ["properties", "System properties", "sysprop getprop setprop persist ro"],
        ["pitfalls", "Common pitfalls", "pitfalls transactiontoolarge deadobject"],
      ],
    },
    {
      id: "power", file: "power.html", num: "03.1", group: "Subsystems",
      title: "Power Management & Garage Mode", short: "Power & Garage Mode", icon: "🔋", accent: "#34d399",
      desc: "Power state machine, Suspend-to-RAM, Hibernation and Garage Mode.",
      sections: [
        ["overview", "Power management overview", "cpms carpowermanager"],
        ["state-machine", "Interactive state machine", "on shutdown_prepare wait_for_vhal suspend hibernation"],
        ["state-table", "States & VHAL signals", "ap_power_state_req ap_power_state_report"],
        ["garage-mode", "Garage Mode sequence", "garage mode jobscheduler ota idle"],
        ["power-policy", "Power Policy & Remote Access", "power policy remote access wake up"],
      ],
    },
    {
      id: "audio", file: "audio.html", num: "03.2", group: "Subsystems",
      title: "Multi-Zone Audio", short: "Multi-Zone Audio", icon: "🔊", accent: "#d4af37",
      desc: "Audio zones, volume groups, audio focus and routing in AAOS 14.",
      sections: [
        ["concepts", "Core concepts", "audio zone volume group context bus"],
        ["zones", "Interactive audio zones", "driver passenger rear zone"],
        ["focus", "Audio focus policy", "focus exclusive concurrent reject ducking"],
        ["routing", "Routing & XML configuration", "car_audio_configuration.xml audiocontrol hal routing"],
      ],
    },
    {
      id: "displays", file: "displays.html", num: "03.3", group: "Subsystems",
      title: "Multi-Display & Occupant Zones", short: "Multi-Display & Occupants", icon: "🖥️", accent: "#70cff8",
      desc: "IVI, instrument cluster, passenger, RSE and CarOccupantZoneManager.",
      sections: [
        ["display-types", "Display types", "cluster ivi rse hud passenger"],
        ["occupant-zones", "Interactive occupant zones", "caroccupantzonemanager zone mapping"],
        ["input-routing", "Input routing", "carinputservice touch rotary"],
        ["mumd", "Multi-User Multi-Display", "mumd visible background user"],
      ],
    },
    {
      id: "security", file: "security.html", num: "03.4", group: "Subsystems",
      title: "Automotive Security & Sandboxing", short: "Security & Sandboxing", icon: "🛡️", accent: "#f87171",
      desc: "Car permissions, SEPolicy, VHAL access control, hardware isolation.",
      sections: [
        ["defense-in-depth", "Defense in depth", "defense depth"],
        ["permissions", "Car permissions", "control_car_climate car_speed car_intent_forward"],
        ["permission-sim", "Permission check simulator", "permission check"],
        ["sepolicy", "SEPolicy & VHAL access", "selinux sepolicy hal_vehicle"],
        ["isolation", "Hardware isolation", "hypervisor gateway firewall hsm"],
      ],
    },
    {
      id: "users", file: "users.html", num: "04", group: "Hands-on",
      title: "Automotive Android User Profiles", short: "User Profiles", icon: "👤", accent: "#d4af37",
      desc: "Multi-user in AAOS: add/switch/remove users, User HAL, MUMD and profile sync to the cluster and ECUs.",
      sections: [
        ["model", "How Android models users", "headless system user hsum user 0 guest full user"],
        ["architecture", "User management architecture", "carusermanager caruserservice user hal"],
        ["operations", "Add, switch, remove users", "create switch remove start guest adb"],
        ["switch-sim", "User switch simulator", "switch_user android_post_switch vehicle_response"],
        ["sync", "Syncing profiles across ECUs", "profile sync cluster seat memory key fob initial_user_info"],
        ["lifecycle", "Lifecycle events & best practices", "user lifecycle listener unlocked switching"],
      ],
    },
    {
      id: "code", file: "code.html", num: "05", group: "Hands-on",
      title: "Practical Code Examples", short: "Code Examples", icon: "💻", accent: "#34d399",
      desc: "Kotlin CarPropertyManager, IVehicle.aidl, C++ VHAL, build & SEPolicy.",
      sections: [
        ["overview", "Overview", "code"],
        ["explorer", "Annotated code explorer", "kotlin aidl cpp android.bp vintf sepolicy manifest"],
        ["checklist", "Checklist: adding a property", "checklist custom vendor property"],
      ],
    },
    {
      id: "extensions", file: "extensions.html", num: "06", group: "Customization",
      title: "OEM Extensibility: System & Plug-in Services", short: "OEM Extensibility", icon: "🧩", accent: "#a78bfa",
      desc: "How OEMs add system services, CarService plug-in services, OemCarService and overlay (RRO) configuration.",
      sections: [
        ["extension-map", "Extension points map", "plugin extension points overview"],
        ["decision", "Which mechanism should I use?", "decision guide choose"],
        ["overlays", "Configuration via overlays (RRO)", "rro overlay config.xml runtime_resource_overlay"],
        ["plugin-services", "CarService plug-in services", "config_earlyStartupServices vendorservicecontroller plugin"],
        ["oem-car-service", "OemCarService (Android 14)", "oemcarservice audio focus policy plugin"],
        ["system-service", "Adding a system service", "system_server systemservice systemserviceregistry framework"],
        ["vendor-service", "Vendor native services & HAL extensions", "vendor aidl hal vintf vendor property"],
        ["golden-rules", "Golden rules", "best practices"],
      ],
    },
    {
      id: "glossary", file: "glossary.html", num: "A", group: "Reference",
      title: "Glossary", short: "Glossary", icon: "📖", accent: "#94a3b8",
      desc: "Quick reference for AAOS, AOSP and automotive terms.",
      sections: [["glossary", "Glossary of terms", "glossary terms"]],
    },
  ];

  /* --------------------------------------------- Official references */
  const SA = "https://source.android.com/docs/";
  const DEV = "https://developer.android.com/";
  const GS = "https://android.googlesource.com/platform/";
  const R = {
    whatAaos: ["What is Android Automotive?", SA + "automotive/start/what_automotive"],
    aaos: ["Android Automotive overview", SA + "automotive"],
    terms: ["Automotive glossary", SA + "automotive/start/terms"],
    virt: ["Virtualization architecture", SA + "automotive/virtualization/architecture"],
    isolation: ["Vehicle system isolation", SA + "automotive/security/vehicle_system_isolation"],
    devCars: ["Build apps for cars (Android Auto & AAOS)", DEV + "training/cars"],
    carApps: ["Car App Library", DEV + "training/cars/apps"],
    arch: ["Android architecture overview", SA + "core/architecture"],
    binder: ["Binder IPC", SA + "core/architecture/hidl/binder-ipc"],
    stableAidl: ["Stable AIDL", SA + "core/architecture/aidl/stable-aidl"],
    aidlHals: ["AIDL for HALs", SA + "core/architecture/aidl/aidl-hals"],
    vintf: ["Vendor interface object (VINTF)", SA + "core/architecture/vintf"],
    hal: ["Hardware abstraction layer overview", SA + "core/architecture/hal"],
    carCore: ["Car framework core", SA + "automotive/car-framework-core"],
    vhal: ["Vehicle HAL overview", SA + "automotive/vhal"],
    vhalIf: ["VHAL interface (AIDL)", SA + "automotive/vhal/vhal-interface"],
    vhalCfg: ["VHAL property configuration", SA + "automotive/vhal/property-configuration"],
    vhalProps: ["Supported system properties", SA + "automotive/vhal/system-properties"],
    vhalRef: ["VHAL reference implementation", SA + "automotive/vhal/reference-implementation"],
    vhalNative: ["Native VHAL client", SA + "automotive/vhal/native-client"],
    vhalDebug: ["Debug the VHAL", SA + "automotive/vhal/vhal_debug"],
    vhalEmu: ["Extend VHAL properties on the emulator", SA + "automotive/start/avd/extend-vhal-properties"],
    seat: ["Seat & steering properties", SA + "automotive/vhal/seat-steering"],
    cpm: ["CarPropertyManager API reference", DEV + "reference/android/car/hardware/property/CarPropertyManager"],
    propIds: ["VehiclePropertyIds API reference", DEV + "reference/android/car/VehiclePropertyIds"],
    carClass: ["android.car.Car API reference (permissions)", DEV + "reference/android/car/Car"],
    power: ["Power management overview", SA + "automotive/power"],
    powerSm: ["Power management (states & VHAL signals)", SA + "automotive/power/power"],
    garage: ["Garage Mode", SA + "automotive/power/garage_mode"],
    policy: ["Power policy", SA + "automotive/power/power_policy"],
    remote: ["Set up remote access", SA + "automotive/remote_access"],
    boot: ["Boot time optimization", SA + "automotive/power/boot_time"],
    audio: ["Automotive audio overview", SA + "automotive/audio"],
    focus: ["Audio focus", SA + "automotive/audio/audio-focus"],
    multizone: ["Multi-zone audio routing", SA + "automotive/audio/audio-multizone-routing"],
    volume: ["Volume management", SA + "automotive/audio/volume-management"],
    audioCtl: ["Audio Control HAL", SA + "automotive/audio/audio-control-hal"],
    audioPol: ["Audio policy configuration", SA + "automotive/audio/audio-policy-configuration"],
    audioPlugin: ["Car audio plugin service (OemCarService)", SA + "automotive/audio/car-audio-plugin"],
    displays: ["Automotive displays overview", SA + "automotive/displays"],
    cluster: ["Instrument cluster API", SA + "automotive/displays/cluster_api"],
    keyInput: ["Key input", SA + "automotive/displays/key_input"],
    mdComms: ["Multi-Display Communications API", SA + "automotive/displays/multi-display-comms-api"],
    rotary: ["Rotary controller", SA + "automotive/hmi/rotary_controller"],
    uxr: ["Driver distraction: CarUxRestrictions", SA + "automotive/driver_distraction/car_uxr"],
    security: ["Automotive security", SA + "automotive/security"],
    selinux: ["SELinux in Android", SA + "security/features/selinux"],
    privPerms: ["Privileged permission allowlisting", SA + "core/permissions/perms-allowlist"],
    multiUser: ["Multi-user in Android Automotive", SA + "automotive/users_accounts/multi_user"],
    userHal: ["User HAL", SA + "automotive/users_accounts/user_hal"],
    userSystem: ["Foreground and background user system handling", SA + "automotive/users_accounts/user_system"],
    accounts: ["Accounts in Android Automotive", SA + "automotive/users_accounts/accounts"],
    coreMultiUser: ["Supporting multiple users (core)", SA + "devices/admin/multi-user"],
    rro: ["Runtime resource overlays (RROs)", SA + "core/runtime/rros"],
    featureCtl: ["Car service feature control", SA + "automotive/feature-control"],
    carUi: ["Car UI library", SA + "automotive/hmi/car_ui"],
    carUiPlugins: ["Car UI library plugins", SA + "automotive/hmi/car_ui/plugins"],
    carUiCustom: ["Customize Car UI apps", SA + "automotive/hmi/car_ui/customize"],
    sysUi: ["Car System UI", SA + "automotive/hmi/system_ui"],
    carCfg: ["CarService config.xml (android14-release source)", GS + "packages/services/Car/+/refs/heads/android14-release/service/res/values/config.xml"],
    ivehicleSrc: ["IVehicle.aidl (AOSP source)", GS + "hardware/interfaces/+/refs/heads/android14-release/automotive/vehicle/aidl/android/hardware/automotive/vehicle/IVehicle.aidl"],
    avd: ["Android Automotive virtual device (emulator)", SA + "automotive/start/avd/android_virtual_device"],
    aidlOverview: ["AIDL overview (platform)", SA + "core/architecture/aidl"],
    aidlBackends: ["AIDL backends (Java, NDK, C++, Rust)", SA + "core/architecture/aidl/aidl-backends"],
    hidlThreading: ["Threading models (oneway, thread pools)", SA + "core/architecture/hidl/threading"],
    binderRef: ["android.os.Binder API reference", DEV + "reference/android/os/Binder"],
    ibinderRef: ["android.os.IBinder API reference", DEV + "reference/android/os/IBinder"],
    parcelRef: ["android.os.Parcel API reference", DEV + "reference/android/os/Parcel"],
    handlerRef: ["android.os.Handler API reference", DEV + "reference/android/os/Handler"],
    looperRef: ["android.os.Looper API reference", DEV + "reference/android/os/Looper"],
    mqRef: ["android.os.MessageQueue API reference", DEV + "reference/android/os/MessageQueue"],
    handlerThreadRef: ["android.os.HandlerThread API reference", DEV + "reference/android/os/HandlerThread"],
    aidlGuide: ["Android Interface Definition Language (AIDL) guide", DEV + "guide/components/aidl"],
    boundSvc: ["Bound services overview", DEV + "guide/components/bound-services"],
    procThreads: ["Processes and threads overview", DEV + "guide/components/processes-and-threads"],
    procLifecycle: ["Processes and app lifecycle", DEV + "guide/components/activities/process-lifecycle"],
    anr: ["ANRs (Application Not Responding)", DEV + "topic/performance/vitals/anr"],
    coroutines: ["Kotlin coroutines on Android", DEV + "kotlin/coroutines"],
    strictMode: ["StrictMode API reference", DEV + "reference/android/os/StrictMode"],
    art: ["Android runtime (ART)", SA + "core/runtime"],
    zygote: ["Zygote", SA + "core/runtime/zygote"],
    sysprops: ["Add system properties", SA + "core/architecture/configuration/add-system-properties"],
    lmkd: ["Low memory killer daemon (lmkd)", SA + "core/perf/lmkd"],
    initReadme: ["init language README (android14-release source)", GS + "system/core/+/refs/heads/android14-release/init/README.md"],
    libbinderSrc: ["libbinder source (android14-release)", GS + "frameworks/native/+/refs/heads/android14-release/libs/binder/"],
    looperSrc: ["Looper.java source (android14-release)", GS + "frameworks/base/+/refs/heads/android14-release/core/java/android/os/Looper.java"],
  };
  const REFS = {
    foundations: ["whatAaos", "aaos", "virt", "isolation", "devCars", "carApps", "terms"],
    architecture: ["arch", "binder", "stableAidl", "aidlHals", "vintf", "hal", "carCore", "vhal", "vhalIf", "vhalCfg", "vhalProps", "cpm"],
    fundamentals: ["binder", "aidlOverview", "aidlBackends", "hidlThreading", "binderRef", "ibinderRef", "parcelRef", "libbinderSrc", "handlerRef", "looperRef", "mqRef", "handlerThreadRef", "looperSrc", "aidlGuide", "boundSvc", "procThreads", "procLifecycle", "anr", "coroutines", "strictMode", "art", "zygote", "lmkd", "initReadme", "sysprops"],
    power: ["power", "powerSm", "garage", "policy", "remote", "boot"],
    audio: ["audio", "focus", "multizone", "volume", "audioCtl", "audioPol", "audioPlugin"],
    displays: ["displays", "cluster", "keyInput", "mdComms", "rotary", "multiUser", "uxr"],
    security: ["security", "isolation", "selinux", "privPerms", "carClass", "uxr"],
    users: ["multiUser", "userHal", "userSystem", "accounts", "coreMultiUser", "seat", "carCfg"],
    code: ["vhalRef", "vhalIf", "ivehicleSrc", "vhalCfg", "vhalNative", "vhalDebug", "vhalEmu", "cpm", "propIds", "avd"],
    extensions: ["rro", "carCfg", "featureCtl", "audioPlugin", "userSystem", "carUi", "carUiPlugins", "carUiCustom", "sysUi", "stableAidl", "aidlHals", "vintf", "privPerms", "selinux"],
    glossary: ["terms", "aaos", "arch"],
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const pageId = document.body.dataset.page || "home";
  const currentPage = SITE.find((p) => p.id === pageId);

  const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  /* --------------------------------------------------------------- Header */
  function renderHeader() {
    const host = $("#site-header");
    if (!host) return;
    const modLinks = SITE.filter((p) => p.group !== "Reference")
      .map((p) => `<a href="${p.file}"><span class="dm-num">${p.num}</span><span><b>${esc(p.short)}</b><i>${esc(p.desc)}</i></span></a>`)
      .join("");
    host.outerHTML = `
      <header class="site-header">
        <button class="menu-btn" id="menu-btn" aria-label="Open table of contents">☰</button>
        <a class="brand" href="index.html" aria-label="AAOS 14 Academy home">
          <div class="brand-mark">A14</div>
          <span>AAOS 14 Academy<small>Automotive OS Handbook</small></span>
        </a>
        <nav class="main-nav" aria-label="Main navigation">
          <a href="index.html" class="${pageId === "home" ? "active" : ""}">Home</a>
          <div class="nav-drop ${currentPage && currentPage.group !== "Reference" ? "active" : ""}">
            <button aria-haspopup="true">Modules ▾</button>
            <div class="nav-drop-menu">${modLinks}</div>
          </div>
          <a href="architecture.html" class="${pageId === "architecture" ? "active" : ""}">Architecture</a>
          <a href="users.html" class="${pageId === "users" ? "active" : ""}">Users</a>
          <a href="code.html" class="${pageId === "code" ? "active" : ""}">Code</a>
          <a href="extensions.html" class="${pageId === "extensions" ? "active" : ""}">Extensibility</a>
          <a href="glossary.html" class="${pageId === "glossary" ? "active" : ""}">Glossary</a>
        </nav>
        <div class="header-spacer"></div>
        <div class="global-search" role="search">
          <span class="s-icon">${ICON_SEARCH}</span>
          <input id="gs-input" type="search" placeholder="Search: VHAL, Garage Mode…" autocomplete="off" aria-label="Search the site">
          <kbd>Ctrl K</kbd>
          <div class="search-results" id="gs-results" role="listbox"></div>
        </div>
        <button class="theme-btn" id="theme-btn" type="button"></button>
      </header>`;
  }

  /* ---------------------------------------------------------- Theme */
  function initTheme() {
    const btn = $("#theme-btn");
    if (!btn) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const effective = () => root.getAttribute("data-theme") || (media.matches ? "light" : "dark");
    const paint = () => {
      const light = effective() === "light";
      btn.textContent = light ? "🌙" : "☀️";
      btn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      btn.title = btn.getAttribute("aria-label");
    };
    btn.addEventListener("click", () => {
      const next = effective() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("aaos-theme", next); } catch (e) { /* storage unavailable */ }
      paint();
    });
    media.addEventListener("change", paint);
    paint();
  }

  /* ------------------------------------------------------- Global search */
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function buildIndex() {
    const idx = [];
    SITE.forEach((p) => {
      idx.push({ title: p.title, sub: p.desc, page: p.short, href: p.file, hay: norm(p.title + " " + p.desc + " " + p.short) });
      p.sections.forEach(([id, t, kw]) => idx.push({ title: t, sub: p.short, page: p.num, href: `${p.file}#${id}`, hay: norm(t + " " + kw + " " + p.short) }));
    });
    (window.GLOSSARY || []).forEach((g) => idx.push({ title: g.term, sub: g.full, page: "Glossary", href: `glossary.html#g-${slug(g.term)}`, hay: norm(g.term + " " + g.full + " " + g.desc) }));
    return idx;
  }
  function hilite(text, q) {
    if (!q) return esc(text);
    const n = norm(text), i = n.indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  function initGlobalSearch() {
    const input = $("#gs-input"), box = $("#gs-results");
    if (!input) return;
    let index = null, sel = -1;
    const run = () => {
      index = index || buildIndex();
      const q = norm(input.value.trim());
      if (!q) { box.classList.remove("open"); return; }
      const terms = q.split(/\s+/);
      const hits = index.filter((e) => terms.every((t) => e.hay.includes(t))).slice(0, 12);
      sel = -1;
      box.innerHTML = hits.length
        ? hits.map((h) => `<a href="${h.href}" role="option"><span class="sr-page">${esc(h.page)}</span><br><b>${hilite(h.title, q)}</b><small>${esc(h.sub)}</small></a>`).join("")
        : `<div class="sr-empty">No results for “${esc(input.value)}”.</div>`;
      box.classList.add("open");
    };
    input.addEventListener("input", run);
    input.addEventListener("focus", () => input.value && run());
    input.addEventListener("keydown", (e) => {
      const items = $$("a", box);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((a, i) => a.classList.toggle("sel", i === sel));
        items[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        const t = items[sel >= 0 ? sel : 0];
        if (t) location.href = t.getAttribute("href");
      } else if (e.key === "Escape") {
        box.classList.remove("open"); input.blur();
      }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".global-search")) box.classList.remove("open"); });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); input.select(); }
      else if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
  }

  /* --------------------------------------------------------------- Sidebar */
  function renderSidebar() {
    const host = $("#sidebar");
    if (!host) return;
    const domSections = $$("section.doc-section[id]");
    const groups = {};
    SITE.forEach((p) => (groups[p.group] = groups[p.group] || []).push(p));
    let html = `
      <div class="sb-progress">
        <div class="sb-progress-label"><span>Reading progress</span><span id="sb-pct">0%</span></div>
        <div class="sb-progress-bar"><div id="sb-bar"></div></div>
      </div>
      <div class="sb-filter">${ICON_SEARCH}
        <input id="sb-filter" type="search" placeholder="Filter contents…" aria-label="Filter table of contents">
        <div class="sb-filter-info" id="sb-filter-info"></div>
      </div>
      <nav aria-label="Table of contents">`;
    Object.entries(groups).forEach(([g, pages]) => {
      html += `<div class="sb-group"><div class="sb-group-title">${esc(g)}</div>`;
      pages.forEach((p) => {
        const cur = p.id === pageId;
        html += `<a class="sb-page ${cur ? "current" : ""}" href="${p.file}" data-hay="${esc(norm(p.title + " " + p.desc + " " + p.sections.map((s) => s[1] + " " + s[2]).join(" ")))}"><span class="sb-num">${p.num}</span>${esc(p.short)}</a>`;
        if (cur && domSections.length) {
          html += `<ul class="sb-sections">` + domSections.map((s) => {
            const title = s.dataset.title || ($("h2", s) || {}).textContent || s.id;
            return `<li><a href="#${s.id}" data-target="${s.id}">${esc(title)}</a></li>`;
          }).join("") + `</ul>`;
        }
      });
      html += `</div>`;
    });
    html += `</nav>`;
    host.innerHTML = html;

    // Filter: matches page titles/keywords and the full text of in-page sections
    const sectionText = new Map(domSections.map((s) => [s.id, norm(s.textContent)]));
    const input = $("#sb-filter"), info = $("#sb-filter-info");
    input.addEventListener("input", () => {
      const q = norm(input.value.trim());
      let hitsSec = 0, hitsPage = 0;
      $$(".sb-sections a", host).forEach((a) => {
        const ok = !q || sectionText.get(a.dataset.target).includes(q) || norm(a.textContent).includes(q);
        a.parentElement.classList.toggle("sb-hidden", !ok);
        if (ok && q) hitsSec++;
      });
      $$(".sb-page", host).forEach((a) => {
        const ok = !q || a.dataset.hay.includes(q) || a.classList.contains("current");
        a.classList.toggle("sb-hidden", !ok);
        if (ok && q && !a.classList.contains("current")) hitsPage++;
      });
      $$(".sb-group", host).forEach((g) => g.classList.toggle("sb-hidden", !$$(".sb-page:not(.sb-hidden)", g).length));
      info.textContent = q ? `${hitsSec} section(s) on this page · ${hitsPage} other page(s)` : "";
    });

    const btn = $("#menu-btn");
    if (btn) {
      btn.addEventListener("click", () => host.classList.toggle("open"));
      host.addEventListener("click", (e) => { if (e.target.closest("a")) host.classList.remove("open"); });
    }
  }

  /* --------------------------------------------- Scrollspy & progress */
  function initScrollspy() {
    const links = $$(".sb-sections a");
    const bar = $("#sb-bar"), pct = $("#sb-pct");
    const sections = $$("section.doc-section[id]");
    const onScroll = () => {
      const h = document.documentElement;
      const p = Math.min(100, Math.max(0, (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100));
      if (bar) bar.style.width = p + "%";
      if (pct) pct.textContent = Math.round(p) + "%";
      let active = sections[0];
      sections.forEach((s) => { if (s.getBoundingClientRect().top - 140 <= 0) active = s; });
      links.forEach((a) => a.classList.toggle("active", active && a.dataset.target === active.id));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function decorateSections() {
    $$("section.doc-section[id]").forEach((s) => {
      const head = $(".sec-head h2", s);
      if (head && !$(".anchor", head)) head.insertAdjacentHTML("beforeend", `<a class="anchor" href="#${s.id}" aria-label="Link to section">#</a>`);
    });
  }

  /* ------------------------------------------------- References */
  function renderReferences() {
    const keys = REFS[pageId];
    const pager = $("#pager");
    if (!keys || !pager) return;
    const host = (s) => s.replace(/^https:\/\/([^/]+).*/, "$1");
    const sec = document.createElement("section");
    sec.className = "doc-section";
    sec.id = "references";
    sec.dataset.title = "Official references";
    sec.innerHTML = `<div class="sec-head"><h2><span class="sec-num">📚</span>Official references</h2></div>
      <p class="small muted">Primary sources for the material on this page. Documentation evolves with each Android release — when in doubt, the AOSP source for your branch is the final authority.</p>
      <div class="ref-list">${keys.map((k) => {
        const [title, url] = R[k];
        return `<a class="ref-item glass" href="${url}" target="_blank" rel="noopener"><b>${esc(title)}</b><small>${esc(host(url))}${esc(url.replace(/^https:\/\/[^/]+/, "").slice(0, 70))}${url.length > 95 ? "…" : ""}</small></a>`;
      }).join("")}</div>`;
    pager.parentNode.insertBefore(sec, pager);
  }

  /* ----------------------------------------------------------- Pager */
  function renderPager() {
    const host = $("#pager");
    if (!host || !currentPage) return;
    const i = SITE.indexOf(currentPage);
    const prev = SITE[i - 1], next = SITE[i + 1];
    host.className = "pager";
    host.innerHTML =
      (prev ? `<a href="${prev.file}"><small>← Previous</small><b>${esc(prev.short)}</b></a>` : `<a href="index.html"><small>← Back</small><b>Home</b></a>`) +
      (next ? `<a class="next" href="${next.file}"><small>Next →</small><b>${esc(next.short)}</b></a>` : "");
  }

  /* ----------------------------------------------------------- Footer */
  function renderFooter() {
    const host = $("#site-footer");
    if (!host) return;
    host.outerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div><b style="color:var(--text)">AAOS 14 Academy</b> — A learning handbook for engineers new to Android Automotive OS 14.<br>
          Educational content; class and method names reference AOSP <code>android-14.0.0</code>. CAN IDs and signal encodings in examples are hypothetical.</div>
          <div class="footer-links">
            ${SITE.slice(0, 3).map((p) => `<a href="${p.file}">${esc(p.short)}</a>`).join("")}
            <a href="users.html">Users</a><a href="code.html">Code</a><a href="extensions.html">Extensibility</a><a href="glossary.html">Glossary</a>
          </div>
        </div>
      </footer>`;
  }

  /* ------------------------------------------------------------- Tabs */
  function initTabs(root = document) {
    $$("[data-tabs]", root).forEach((tabs) => {
      if (tabs.dataset.ready) return;
      tabs.dataset.ready = "1";
      const btns = $$(":scope > .tab-list > button", tabs);
      const panels = $$(":scope > .tab-panel", tabs);
      const select = (key, focus) => {
        btns.forEach((b) => {
          const on = b.dataset.tab === key;
          b.setAttribute("aria-selected", on);
          b.tabIndex = on ? 0 : -1;
          if (on && focus) b.focus();
        });
        panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === key));
      };
      btns.forEach((b, i) => {
        b.setAttribute("role", "tab");
        b.addEventListener("click", () => select(b.dataset.tab));
        b.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            const n = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
            select(n.dataset.tab, true);
          }
        });
      });
      tabs.selectTab = select;
      const initial = btns.find((b) => b.getAttribute("aria-selected") === "true") || btns[0];
      if (initial) select(initial.dataset.tab);
    });
  }

  /* ---------------------------------------------------- Highlighter */
  const KW = {
    kotlin: "package import class object fun val var private public protected internal override return if else when null true false as is in for while interface companion const data sealed this super throw try catch finally lateinit by",
    java: "package import class interface public private protected static final void return if else for while new null true false this super throws throw try catch finally extends implements synchronized int long float double boolean byte instanceof switch case default break",
    cpp: "namespace class struct public private protected override final const constexpr static auto return if else switch case default break continue for while do void int float double bool true false nullptr using template typename virtual explicit operator new delete inline char unsigned signed long short enum sizeof this",
    aidl: "package import interface parcelable oneway in out inout void int long float double byte boolean String const enum union",
    xml: "",
    conf: "true false type allow neverallow attribute service class user group typeattribute",
  };
  const TYPES = new Set("uint8_t uint16_t uint32_t int32_t int64_t size_t std string vector shared_ptr unique_ptr Float Int Long Boolean String Any Unit".split(" "));
  function tokenize(code, lang) {
    if (lang === "xml") return tokXml(code);
    const kw = new Set((KW[lang] || "").split(" "));
    const com = lang === "conf" ? String.raw`\/\/[^\n]*|#[^\n]*` : String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
    const pp = lang === "cpp" ? String.raw`^[ \t]*#[a-z]+[^\n]*` : String.raw`(?!)`;
    const re = new RegExp(`(${com})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])')|(${pp})|(@[A-Za-z_]\\w*)|(\\b0x[0-9A-Fa-f]+\\b|\\b\\d+(?:\\.\\d+)?[fFLu]?\\b)|([A-Za-z_]\\w*)|([\\s\\S])`, "gm");
    const out = [];
    let m;
    while ((m = re.exec(code))) {
      let cls = "";
      const t = m[0];
      if (m[1]) cls = "com";
      else if (m[2]) cls = "str";
      else if (m[3]) cls = "pp";
      else if (m[4]) cls = "ann";
      else if (m[5]) cls = "num";
      else if (m[6]) {
        const nextCh = code[re.lastIndex];
        if (kw.has(t)) cls = "kw";
        else if (/^[A-Z][A-Z0-9_]{2,}$/.test(t)) cls = "cst";
        else if (nextCh === "(") cls = "fn";
        else if (/^[A-Z]/.test(t) || TYPES.has(t)) cls = "ty";
      }
      push(out, cls, t);
    }
    return out;
  }
  function tokXml(code) {
    const re = /(<!--[\s\S]*?-->)|(<\/?[\w:.-]+)|([\w:.-]+)(?==)|("[^"]*")|(\/?>|\?>)|([\s\S])/g;
    const out = [];
    let m;
    while ((m = re.exec(code))) {
      const cls = m[1] ? "com" : m[2] ? "tag" : m[3] ? "attr" : m[4] ? "str" : m[5] ? "tag" : "";
      push(out, cls, m[0]);
    }
    return out;
  }
  function push(out, cls, t) {
    const last = out[out.length - 1];
    if (last && last.cls === cls && !cls) last.text += t;
    else out.push({ cls, text: t });
  }
  function toLines(tokens) {
    const lines = [[]];
    tokens.forEach((tok) => {
      tok.text.split("\n").forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part) lines[lines.length - 1].push(tok.cls ? `<span class="t-${tok.cls}">${esc(part)}</span>` : esc(part));
      });
    });
    return lines.map((l) => l.join(""));
  }

  /** Strip «n» markers from code, return {code, marks: {lineIndex: n}} */
  function parseMarks(src) {
    const marks = {};
    const lines = src.replace(/^\n+|\s+$/g, "").split("\n").map((line, i) => {
      const m = line.match(/\s*«(\d+)»\s*$/);
      if (m) { marks[i] = +m[1]; return line.slice(0, m.index); }
      return line;
    });
    return { code: lines.join("\n"), marks };
  }

  function codeBlockHTML({ code, lang, file, marks = {}, label }) {
    const lines = toLines(tokenize(code, lang));
    const body = lines.map((l, i) => {
      const n = marks[i];
      return `<div class="cl${n ? " ann" : ""}" ${n ? `data-ann="${n}"` : ""}><span class="lno">${i + 1}</span><span class="lc">${l || " "}</span>${n ? `<span class="abadge">${n}</span>` : ""}</div>`;
    }).join("");
    return `<div class="code-block">
      <div class="code-head"><div class="dots"><i></i><i></i><i></i></div><span class="fname">${esc(file || "")}</span>
      <span class="lang badge gray">${esc(label || lang)}</span><button class="copy-btn" type="button">Copy</button></div>
      <pre class="code" tabindex="0">${body}</pre></div>`;
  }
  function wireCopy(root) {
    $$(".copy-btn", root).forEach((b) => {
      if (b.dataset.wired) return;
      b.dataset.wired = "1";
      b.addEventListener("click", () => {
        const pre = b.closest(".code-block").querySelector("pre");
        const text = $$(".lc", pre).map((x) => x.textContent).join("\n");
        const done = () => { b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = "Copy"), 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
        else fallbackCopy(text, done);
      });
    });
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    ta.remove();
  }
  /** Highlighted block from <script type="text/plain" data-code data-lang data-file> */
  function renderStaticCode(root = document) {
    $$("script[type='text/plain'][data-code]", root).forEach((s) => {
      const { code } = parseMarks(s.textContent);
      const wrap = document.createElement("div");
      wrap.innerHTML = codeBlockHTML({ code, lang: s.dataset.lang, file: s.dataset.file, label: s.dataset.label });
      s.replaceWith(wrap.firstElementChild);
    });
    wireCopy(root);
  }

  /** Annotated explorer: code on the left, explanations on the right */
  function renderCodeExplorer(host, spec) {
    const { code, marks } = parseMarks(spec.src);
    const notes = spec.notes;
    host.innerHTML = `<div class="code-explorer">
      ${codeBlockHTML({ code, lang: spec.lang, file: spec.file, marks, label: spec.label })}
      <div class="ann-list glass">${Object.keys(notes).map((n) => `<div class="ann-item" data-ann="${n}"><span class="an">${n}</span><div><b>${esc(notes[n][0])}</b><p>${notes[n][1]}</p></div></div>`).join("")}</div>
    </div>`;
    const pre = $("pre", host), list = $(".ann-list", host);
    const select = (n, from) => {
      $$(".cl.hl", pre).forEach((x) => x.classList.remove("hl"));
      $$(".ann-item", list).forEach((x) => x.classList.toggle("sel", x.dataset.ann === String(n)));
      const line = $(`.cl[data-ann="${n}"]`, pre);
      if (line) {
        line.classList.add("hl");
        if (from === "list") pre.scrollTo({ top: line.offsetTop - pre.clientHeight / 3, behavior: "smooth" });
      }
      const item = $(`.ann-item[data-ann="${n}"]`, list);
      if (item && from === "code") list.scrollTo({ top: item.offsetTop - 10, behavior: "smooth" });
    };
    $$(".cl.ann", pre).forEach((l) => l.addEventListener("click", () => select(l.dataset.ann, "code")));
    $$(".ann-item", list).forEach((it) => it.addEventListener("click", () => select(it.dataset.ann, "list")));
    wireCopy(host);
  }

  /* -------------------------------------------------- Sequence engine */
  /**
   * lanes: [{title, sub}]
   * steps: [{from, to, kind:'call'|'ipc'|'hw'|'ret', label, svg, title, detail, code, codeLang, codeFile, analogy, tags}]
   */
  function SequenceDiagram(host, opts) {
    const { lanes, steps } = opts;
    const laneW = opts.laneW || 172, padX = 16, headH = 64, rowH = 46, top = headH + 26;
    const W = padX * 2 + lanes.length * laneW;
    const H = top + steps.length * rowH + 20;
    const lx = (i) => padX + laneW * i + laneW / 2;
    let cur = -1, timer = null;

    const kinds = ["call", "ipc", "hw", "ret", "self"];
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.ariaLabel || "Sequence diagram")}"><defs>`;
    kinds.forEach((k) => {
      svg += `<marker id="${host.id}-ah-${k}" class="k-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>`;
    });
    svg += `</defs>`;
    lanes.forEach((l, i) => {
      const x = padX + laneW * i + 6;
      svg += `<line class="seq-lifeline" x1="${lx(i)}" y1="${headH}" x2="${lx(i)}" y2="${H - 8}"/>`;
      const tip = l.tip || (window.AAOS.Diagram ? window.AAOS.Diagram.termTip(l.title) || window.AAOS.Diagram.termTip(l.sub) : "");
      svg += `<g class="seq-lane"${tip ? ` data-tip="${esc(tip)}"` : ""}><rect class="seq-lane-box" data-lane="${i}" x="${x}" y="8" width="${laneW - 12}" height="${headH - 14}" rx="9"/>`;
      svg += `<text class="seq-lane-title" x="${lx(i)}" y="30" text-anchor="middle">${esc(l.title)}</text>`;
      svg += `<text class="seq-lane-sub" x="${lx(i)}" y="46" text-anchor="middle">${esc(l.sub)}</text></g>`;
    });
    steps.forEach((s, i) => {
      const y = top + i * rowH;
      const self = s.from === s.to;
      const k = self ? "self" : s.kind || "call";
      const colorKind = self ? (s.kind && s.kind !== "call" ? s.kind : "self") : k;
      svg += `<g class="seq-msg k-${colorKind}${k === "ret" ? " ret" : ""}" data-step="${i}">`;
      if (self) {
        const x = lx(s.from);
        svg += `<path class="seq-line" d="M${x},${y - 6} h34 v18 h-30" marker-end="url(#${host.id}-ah-self)"/>`;
        svg += `<text class="seq-label" x="${x + 40}" y="${y + 6}">${esc(s.svg || s.label)}</text>`;
      } else {
        const x1 = lx(s.from), x2 = lx(s.to);
        const dir = x2 > x1 ? 1 : -1;
        svg += `<line class="seq-line" x1="${x1 + dir * 4}" y1="${y}" x2="${x2 - dir * 4}" y2="${y}" marker-end="url(#${host.id}-ah-${k})"/>`;
        svg += `<text class="seq-label" x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle">${esc(s.svg || s.label)}</text>`;
      }
      const ix = Math.max(12, lx(Math.min(s.from, s.to)) - 26);
      svg += `<circle class="seq-idx-bg" cx="${ix}" cy="${y}" r="10"/><text class="seq-idx" x="${ix}" y="${y + 3.5}" text-anchor="middle">${i + 1}</text>`;
      svg += `</g>`;
    });
    svg += `</svg>`;

    host.classList.add("seq", "glass");
    host.innerHTML = `
      <div class="seq-toolbar">
        <button class="btn sm" data-act="reset" title="Reset (R)">⟲ Reset</button>
        <button class="btn sm" data-act="prev" title="Previous step (←)">◀ Prev</button>
        <button class="btn sm primary" data-act="next" title="Next step (→)">Next ▶</button>
        <button class="btn sm" data-act="play" title="Autoplay (Space)">▶ Auto</button>
        <label class="seq-speed">Speed <select data-act="speed"><option value="3200">Slow</option><option value="2200" selected>Normal</option><option value="1300">Fast</option></select></label>
        <span class="seq-count">0 / ${steps.length}</span>
      </div>
      <div class="seq-progress"><div></div></div>
      <div class="seq-canvas" tabindex="0" aria-label="Use the arrow keys to step through">${svg}</div>
      <div class="seq-legend"><span class="k-call">In-process call</span><span class="k-ipc">Binder IPC</span><span class="k-hw">Hardware / bus</span><span class="k-ret">Callback / event back</span></div>
      <div class="seq-detail">
        <div class="sd-main"></div>
        <div class="sd-side"></div>
      </div>`;

    const main = $(".sd-main", host), side = $(".sd-side", host);
    const count = $(".seq-count", host), prog = $(".seq-progress > div", host);
    const playBtn = $('[data-act="play"]', host);
    const speedSel = $('[data-act="speed"]', host);
    const intro = opts.intro || "Press <b>Next ▶</b> or <kbd>→</kbd> to begin.";

    function render() {
      $$(".seq-msg", host).forEach((g) => {
        const i = +g.dataset.step;
        g.classList.toggle("cur", i === cur);
        g.classList.toggle("done", i < cur);
      });
      const s = steps[cur];
      $$(".seq-lane-box", host).forEach((r) => r.classList.toggle("on", !!s && (+r.dataset.lane === s.from || +r.dataset.lane === s.to)));
      // Signal pulse travelling along the current message arrow
      $$(".hd-pulse.live", host).forEach((n) => n.remove());
      if (s && window.AAOS.Diagram) {
        const line = $(`.seq-msg[data-step="${cur}"] .seq-line`, host);
        window.AAOS.Diagram.attachPulse(line, "", s.from === s.to ? 1.2 : 1.1);
      }
      count.textContent = `${cur + 1} / ${steps.length}`;
      prog.style.width = ((cur + 1) / steps.length) * 100 + "%";
      if (!s) {
        main.innerHTML = `<h4>Ready</h4><p class="muted">${intro}</p>`;
        side.innerHTML = opts.introSide || `<p class="muted small">Each step shows the component executing, the IPC mechanism, the matching code and a real-world analogy.</p>`;
      } else {
        main.innerHTML = `<div class="seq-tags"><span class="badge gray">Step ${cur + 1}</span>${(s.tags || []).map((t) => `<span class="badge ${t[1] || ""}">${esc(t[0])}</span>`).join("")}</div>
          <h4>${esc(s.title || s.label)}</h4><div>${s.detail || ""}</div>`;
        side.innerHTML = (s.code ? codeBlockHTML({ code: s.code, lang: s.codeLang || "kotlin", file: s.codeFile || "", label: s.codeLang || "" }) : "") +
          (s.analogy ? `<div class="callout analogy"><div class="ci">🎭</div><div><span class="ct">Analogy</span>${s.analogy}</div></div>` : "");
        wireCopy(side);
      }
      if (opts.onStep) opts.onStep(cur, s);
    }
    const go = (i) => { cur = Math.max(-1, Math.min(steps.length - 1, i)); render(); };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = "▶ Auto"; };
    const play = () => {
      if (timer) return stop();
      if (cur >= steps.length - 1) go(-1);
      playBtn.textContent = "⏸ Pause";
      go(cur + 1);
      timer = setInterval(() => { if (cur >= steps.length - 1) stop(); else go(cur + 1); }, +speedSel.value);
    };
    host.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (a && a.tagName === "BUTTON") {
        const act = a.dataset.act;
        if (act !== "play") stop();
        if (act === "next") go(cur + 1);
        if (act === "prev") go(cur - 1);
        if (act === "reset") go(-1);
        if (act === "play") play();
      }
      const g = e.target.closest(".seq-msg");
      if (g) { stop(); go(+g.dataset.step); }
    });
    speedSel.addEventListener("change", () => { if (timer) { stop(); play(); } });
    host.addEventListener("keydown", (e) => {
      if (/select|input/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(cur - 1); }
      if (e.key === " ") { e.preventDefault(); play(); }
      if (e.key.toLowerCase() === "r") { stop(); go(-1); }
    });
    render();
    return { go, play, stop, get index() { return cur; } };
  }

  /* ------------------------------------------------------ Tooltips */
  /** Any element (HTML or SVG) with data-tip="…" gets a styled tooltip on hover and keyboard focus. */
  function initTooltips() {
    const tt = document.createElement("div");
    tt.className = "tt";
    tt.setAttribute("role", "tooltip");
    document.body.appendChild(tt);
    let owner = null;
    const render = (el) => {
      const raw = el.getAttribute("data-tip");
      const i = raw.indexOf(" — ");
      tt.innerHTML = i > 0 ? `<b>${esc(raw.slice(0, i))}</b> — ${esc(raw.slice(i + 3))}` : esc(raw);
    };
    const place = (x, y) => {
      const r = tt.getBoundingClientRect();
      let left = x + 14, top = y + 16;
      if (left + r.width > innerWidth - 8) left = x - r.width - 14;
      if (top + r.height > innerHeight - 8) top = y - r.height - 12;
      tt.style.left = Math.max(8, left) + "px";
      tt.style.top = Math.max(8, top) + "px";
    };
    const show = (el, x, y) => {
      if (!el.getAttribute("data-tip")) return;
      owner = el; render(el); tt.classList.add("show"); place(x, y);
    };
    const hide = () => { owner = null; tt.classList.remove("show"); };
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest && e.target.closest("[data-tip]");
      if (el && el !== owner) show(el, e.clientX, e.clientY);
      else if (!el) hide();
    });
    document.addEventListener("pointermove", (e) => { if (owner) place(e.clientX, e.clientY); });
    document.addEventListener("focusin", (e) => {
      const el = e.target.closest && e.target.closest("[data-tip]");
      if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.bottom); } else hide();
    });
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, { passive: true });
  }

  /* --------------------------------------------------------- Boot */
  function boot() {
    initTooltips();
    renderHeader();
    initTheme();
    renderReferences();
    renderSidebar();
    decorateSections();
    renderPager();
    renderFooter();
    initGlobalSearch();
    initScrollspy();
    initTabs();
    renderStaticCode();
    if (location.hash) {
      const jump = () => {
        const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
      };
      if (document.readyState === "complete") setTimeout(jump, 0);
      else window.addEventListener("load", () => setTimeout(jump, 0), { once: true });
    }
  }

  window.AAOS = { SITE, $, $$, esc, norm, slug, initTabs, tokenize, toLines, codeBlockHTML, parseMarks, renderCodeExplorer, renderStaticCode, wireCopy, SequenceDiagram };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
