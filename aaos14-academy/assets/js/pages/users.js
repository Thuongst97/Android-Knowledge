(function () {
  "use strict";
  const { $, $$, esc, Diagram: D, SequenceDiagram } = window.AAOS;
  const BLUE = "#70cff8", PURPLE = "#a78bfa", GREEN = "#34d399", AMBER = "#fbbf24", GRAY = "#94a3b8";

  /* ------------------------- User model diagram ------------------------- */
  (function () {
    let s = D.defs("um");
    s += D.box(20, 14, 960, 96, { c: PURPLE, title: "User 0 — headless system user (always running, never on a display)" });
    s += D.chips(32, 44, 936, ["system_server services", "CarService", "VHAL client", "carpowerpolicyd", "user=system plug-in services", "telemetry", "no launcher · no personal data"]).svg;
    s += D.note(32, 98, "Survives every user switch — the vehicle never “logs out”");

    const users = [
      { t: "User 10 — Alex (driver)", sub: "CURRENT / foreground user", c: BLUE, chips: ["IVI display", "Cluster", "HUD", "/data/user/10"] },
      { t: "User 11 — Bea (passenger)", sub: "visible background user (MUMD)", c: GREEN, chips: ["Passenger display", "Audio zone 1", "/data/user/11"] },
      { t: "User 12 — Kid (rear)", sub: "visible background user (MUMD)", c: AMBER, chips: ["Rear-left RSE", "Audio zone 2", "/data/user/12"] },
      { t: "Guest", sub: "ephemeral — wiped on exit", c: GRAY, chips: ["Valet / rental", "restricted", "auto-removed"] },
    ];
    const w = (960 - 30) / 4;
    users.forEach((u, i) => {
      const x = 20 + i * (w + 10);
      s += D.box(x, 140, w, 126, { c: u.c, title: u.t, sub: u.sub, soft: i === 3 });
      s += D.chips(x + 12, 184, w - 24, u.chips).svg;
      s += D.arrow(`M${x + w / 2},139 V111`, "", "um");
    });
    s += D.note(500, 290, "Each user = separate storage, accounts, app instances (UID = userId × 100000 + appId)", "middle");
    $("#hd-users").innerHTML = D.svg(1000, 300, s, "Android users in AAOS with headless system user");
  })();

  /* ------------------------- Architecture diagram ------------------------- */
  (function () {
    let s = D.defs("ua");
    s += D.row(20, 14, 960, 48, [
      { title: "Settings · Profiles", sub: "add / switch / remove", c: BLUE },
      { title: "OEM profile picker", sub: "welcome screen", c: BLUE },
      { title: "Passenger login", sub: "MUMD start on display", c: BLUE },
      { title: "Plug-in services", sub: "lifecycle listeners", c: GREEN },
    ]);
    s += D.box(20, 80, 960, 34, { c: PURPLE, title: "CarUserManager (system API) — createUser · switchUser · removeUser · startUser · addListener", center: true, titleY: 22 });
    s += D.arrow("M500,114 V139", "ipc", "ua");

    s += D.box(20, 140, 470, 120, { c: PURPLE, title: "CarService — CarUserService", sub: "policy · orchestration · lifecycle fan-out" });
    s += D.chips(32, 186, 446, ["request validation", "OEM policy (e.g. not while driving)", "UserHalService", "InitialUserSetter", "lifecycle event dispatch", "VendorServiceController re-binds"]).svg;
    s += D.box(510, 140, 470, 120, { c: BLUE, title: "system_server", sub: "the framework really manages users" });
    s += D.chips(522, 186, 446, ["UserManagerService: create / remove / types / restrictions", "ActivityManager: start / switch / stop / unlock", "Storage: /data/user/<id> + CE keys"]).svg;
    s += D.arrow("M490,200 H509", "ipc", "ua");

    s += `<line class="hd-line" x1="20" y1="276" x2="980" y2="276"/>` + D.note(980, 272, "Treble boundary", "end");
    s += D.box(20, 288, 960, 64, { c: GREEN, title: "Vehicle HAL — User HAL properties" });
    s += D.chips(32, 318, 936, ["INITIAL_USER_INFO", "SWITCH_USER", "CREATE_USER", "REMOVE_USER", "USER_IDENTIFICATION_ASSOCIATION", "+ OEM vendor profile properties"]).svg;
    s += D.arrow("M255,260 V287", "ipc", "ua");

    s += D.box(20, 370, 960, 40, { c: GRAY, title: "MCU / body domain — owns profileId ↔ userId ↔ key fob mapping, gates actuators on vehicle state", center: true, titleY: 25 });
    s += D.arrow("M500,352 V369", "", "ua");
    s += D.row(20, 428, 960, 50, [
      { title: "Seat & mirror ECU", sub: "memory slots", c: AMBER },
      { title: "Cluster VM", sub: "layout · theme · units", c: AMBER },
      { title: "HVAC ECU", sub: "preferred climate", c: AMBER },
      { title: "Body / ambient", sub: "light scenes", c: AMBER },
      { title: "HUD", sub: "brightness · content", c: AMBER },
      { title: "Telematics", sub: "cloud profile", c: AMBER },
    ]);
    s += D.arrow("M500,410 V427", "", "ua") + D.note(510, 422, "active profile broadcast (CAN / SOME-IP)");
    $("#hd-user-arch").innerHTML = D.svg(1000, 490, s, "User management architecture in AAOS");
  })();

  /* ------------------------- Switch sequence ------------------------- */
  const lanes = [
    { title: "Profile picker UI", sub: "system app (user 10)" },
    { title: "CarUserService", sub: "CarService · user 0" },
    { title: "ActivityManager", sub: "system_server" },
    { title: "VHAL · User HAL", sub: "SWITCH_USER" },
    { title: "MCU / Gateway", sub: "profile owner" },
    { title: "ECUs", sub: "seat · mirrors · cluster" },
  ];
  const steps = [
    { from: 0, to: 1, kind: "ipc", svg: "switchUser(user 11)", label: "CarUserManager.switchUser(UserSwitchRequest(11))", title: "Bea taps her profile", detail: "<p>The picker calls the car system API. The request crosses Binder into CarService, which runs in user 0 and therefore survives the switch it is about to perform.</p>", tags: [["Binder IPC", "purple"]], code: "carUserManager.switchUser(UserSwitchRequest.Builder(UserHandle.of(11)).build(), executor) { r -> }", codeLang: "kotlin" },
    { from: 1, to: 1, svg: "validate + policy", label: "Validate: user exists, not current, no switch in progress, OEM policy", title: "CarUserService validates", detail: "<p>Rejects unknown users, no-op switches and concurrent switches. OEMs commonly add policy here or in the HAL — e.g. only allow switching while parked.</p>", tags: [["Car policy", ""]] },
    { from: 1, to: 3, kind: "ipc", svg: "SWITCH_USER(ANDROID_SWITCH)", label: "set SWITCH_USER [req, ANDROID_SWITCH, target=11, current=10, users…]", title: "Ask the vehicle for approval", detail: "<p>UserHalService writes the <code>SWITCH_USER</code> property with message type <code>ANDROID_SWITCH</code> plus the target user, current user and the full user list, then waits (bounded timeout) for the vehicle's answer.</p>", code: "// int32Values: [requestId, messageType=ANDROID_SWITCH, targetUserId=11, targetFlags,\n//               currentUserId=10, currentFlags, numberOfUsers, (userId, flags)…]", codeLang: "cpp", tags: [["User HAL", "green"], ["Treble boundary", "amber"]] },
    { from: 3, to: 4, kind: "hw", svg: "profile switch request", label: "OEM message: request switch to profile 2", title: "VHAL forwards to the profile owner", detail: "<p>The VHAL translates the request into the OEM's protocol to the MCU / body domain, which owns the userId ⇄ profileId mapping.</p>", tags: [["Vehicle bus", "amber"]] },
    { from: 4, to: 4, kind: "hw", svg: "check vehicle state", label: "Gate: parked? seat not moving? profile slot valid?", title: "Vehicle-side checks", detail: "<p>Safety and consistency checks happen where the actuators are controlled — Android cannot override them.</p>", analogy: "Before a hotel hands a room to a new guest, housekeeping confirms the room is actually ready — the front desk alone can't decide that." },
    { from: 4, to: 3, kind: "hw", svg: "approved", label: "OEM message: switch approved", title: "Vehicle approves" , detail: "<p>The MCU answers positively. (On refusal, the HAL returns FAILURE with an optional message, and Android stays on user 10.)</p>" },
    { from: 3, to: 1, kind: "ret", svg: "VEHICLE_RESPONSE(SUCCESS)", label: "onPropertyEvent SWITCH_USER [req, VEHICLE_RESPONSE, SUCCESS]", title: "HAL response", detail: "<p>The VHAL reports <code>VEHICLE_RESPONSE</code> with <code>SwitchUserStatus::SUCCESS</code> for the same request ID.</p>", code: "resp.value.int32Values = {requestId,\n    toInt(SwitchUserMessageType::VEHICLE_RESPONSE),\n    toInt(SwitchUserStatus::SUCCESS)};", codeLang: "cpp" },
    { from: 1, to: 2, kind: "ipc", svg: "switchUser(11)", label: "ActivityManager.switchUser(11)", title: "Android performs the switch", detail: "<p>Only now does CarUserService ask the framework to switch.</p>", tags: [["Binder IPC", "purple"]] },
    { from: 2, to: 2, svg: "bg user 10 · start+unlock 11", label: "Background/stop user 10 → start & unlock user 11 → launcher(11)", title: "Framework switch", detail: "<p>ActivityManager moves user 10's tasks to the background (or stops the user), starts user 11, unlocks its credential-encrypted storage and brings up user 11's launcher on the driver displays.</p>" },
    { from: 2, to: 1, kind: "ret", svg: "SWITCHING · UNLOCKED(11)", label: "Lifecycle: SWITCHING(10→11), UNLOCKING, UNLOCKED", title: "Lifecycle events", detail: "<p>CarUserService receives the lifecycle events and fans them out to <code>CarUserManager</code> listeners. <code>VendorServiceController</code> re-binds <code>user=foreground</code> plug-ins as user 11.</p>" },
    { from: 1, to: 3, kind: "ipc", svg: "SWITCH_USER(POST_SWITCH)", label: "set SWITCH_USER [req, ANDROID_POST_SWITCH, current=11]", title: "Tell the vehicle the switch is done", detail: "<p>The post-switch message carries the user that is <em>actually</em> current — the vehicle uses it as the source of truth.</p>", tags: [["User HAL", "green"]] },
    { from: 3, to: 4, kind: "hw", svg: "active profile = 2", label: "OEM message: active profile = 2", title: "Forward to the MCU", detail: "<p>The VHAL tells the profile owner which profile is now active.</p>" },
    { from: 4, to: 5, kind: "hw", svg: "PROFILE_ID = 2 broadcast", label: "CAN / SOME-IP broadcast: ACTIVE_PROFILE_ID = 2", title: "Broadcast to every ECU", detail: "<p>One broadcast reaches all interested ECUs — the seat module, mirrors, cluster, HVAC, HUD, ambient light.</p>", tags: [["Vehicle bus", "amber"]] },
    { from: 5, to: 5, kind: "hw", svg: "recall seat · cluster theme", label: "Seat/mirror recall slot 2 · cluster loads Bea's layout · HVAC 21.5°C", title: "ECUs restore Bea's settings", detail: "<p>Each ECU applies settings it stores for profile 2. The cluster VM switches to Bea's layout and units; HVAC applies her preferred temperature (or a user=foreground plug-in pushes it from Android).</p>", analogy: "Like a theatre lighting board: the director calls “scene 2” once, and every light, curtain and speaker moves to its stored position for that scene." },
    { from: 1, to: 0, kind: "ret", svg: "UserSwitchResult(SUCCESS)", label: "callback: UserSwitchResult(SUCCESS)", title: "Done", detail: "<p>The original caller's callback fires with success. Bea sees her launcher, accounts and media; the car around her has adapted too.</p>" },
  ];
  SequenceDiagram($("#switch-seq"), { lanes, steps, ariaLabel: "User switch with vehicle profile sync", laneW: 176, intro: "Switch from Alex (user 10) to Bea (user 11). Press <b>Next ▶</b> or <kbd>→</kbd>." });

  /* ------------------------- Profile apply widget ------------------------- */
  const PROFILES = {
    Alex: { user: 10, profile: 1, color: BLUE, seat: "Slot 1 · tall driver, seat back", mirrors: "Slot 1", cluster: "Sport layout · km/h · dark", hvac: "20.0 °C · auto", ambient: "Ice blue", hud: "Speed + navigation", media: "Alex's Spotify account" },
    Bea: { user: 11, profile: 2, color: GREEN, seat: "Slot 2 · seat forward, higher", mirrors: "Slot 2", cluster: "Classic layout · mph · light", hvac: "21.5 °C · seat heat 2", ambient: "Warm amber", hud: "Speed only", media: "Bea's podcasts" },
    Guest: { user: 12, profile: 0, color: GRAY, seat: "No memory recall", mirrors: "No change", cluster: "Default layout", hvac: "Vehicle default", ambient: "Off", hud: "Default", media: "Empty, nothing saved" },
  };
  const ROWS = [
    ["seat", "Seat ECU", "ECU memory"], ["mirrors", "Mirror / door ECU", "ECU memory"], ["cluster", "Cluster VM", "Cluster store"],
    ["hvac", "HVAC ECU", "Android → VHAL"], ["ambient", "Body ECU (ambient)", "ECU memory"], ["hud", "HUD", "Android → VHAL"], ["media", "AVN (Android user)", "/data/user/<id>"],
  ];
  const pick = $("#profile-pick"), box = $("#profile-ecus");
  pick.innerHTML = Object.keys(PROFILES).map((k) => `<button class="btn sm" data-p="${k}">${k}</button>`).join("");
  let timers = [];
  function apply(name) {
    const p = PROFILES[name];
    timers.forEach(clearTimeout); timers = [];
    $$("button", pick).forEach((b) => b.classList.toggle("primary", b.dataset.p === name));
    box.innerHTML = `<p class="small" style="margin:0 0 10px">Android user <code>${p.user}</code> → vehicle profile <code>${p.profile || "none (guest)"}</code></p>
      <div class="table-wrap" style="margin:0"><table class="t"><thead><tr><th>Subsystem</th><th>Stored in</th><th>Applied setting</th><th>Status</th></tr></thead><tbody>
      ${ROWS.map((r) => `<tr><td>${r[1]}</td><td class="small muted">${esc(r[2])}</td><td>${esc(p[r[0]])}</td><td class="mono small" data-st="${r[0]}" style="color:var(--amber)">⏳ syncing…</td></tr>`).join("")}
      </tbody></table></div>`;
    ROWS.forEach((r, i) => timers.push(setTimeout(() => {
      const cell = $(`[data-st="${r[0]}"]`, box);
      if (cell) { cell.textContent = "✓ applied"; cell.style.color = "var(--green)"; }
    }, 250 + i * 220)));
  }
  pick.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) apply(b.dataset.p); });
  apply("Bea");

  /* ------------------------- Boot with key fob ------------------------- */
  const bootLanes = [
    { title: "Key fob / BCM", sub: "body domain" },
    { title: "MCU", sub: "profile owner" },
    { title: "VHAL · User HAL", sub: "INITIAL_USER_INFO" },
    { title: "CarUserService", sub: "CarService" },
    { title: "ActivityManager", sub: "system_server" },
  ];
  const bootSteps = [
    { from: 0, to: 1, kind: "hw", svg: "unlock with fob #2", label: "Car unlocked with key fob #2", title: "Bea unlocks the car", detail: "<p>The body domain identifies which key fob was used and informs the MCU.</p>" },
    { from: 1, to: 1, kind: "hw", svg: "recall seat (pre-boot)", label: "Recall seat & mirrors for profile 2 before Android boots", title: "Instant comfort", detail: "<p>The seat starts moving immediately — no need to wait for Android. This is why seat memory usually lives in the ECU.</p>" },
    { from: 1, to: 2, kind: "hw", svg: "wake SoC → boot", label: "Wake the SoC, Android boots", title: "Android starts", detail: "<p>The MCU powers the SoC; Android and CarService start in user 0.</p>" },
    { from: 3, to: 2, kind: "ipc", svg: "get INITIAL_USER_INFO", label: "INITIAL_USER_INFO [req, COLD_BOOT, users…]", title: "Which user should I start?", detail: "<p>Before starting any full user, CarUserService asks the vehicle. The request type tells the vehicle whether this is a first boot, first boot after OTA, cold boot or resume.</p>", tags: [["User HAL", "green"]] },
    { from: 2, to: 1, kind: "hw", svg: "who unlocked?", label: "Query: identifier used → fob #2 → user 11", title: "Resolve identity", detail: "<p>The vehicle maps fob #2 to profile 2, associated with Android user 11 (set earlier via <code>USER_IDENTIFICATION_ASSOCIATION</code>).</p>" },
    { from: 2, to: 3, kind: "ret", svg: "SWITCH → user 11", label: "Response [req, action=SWITCH, userId=11]", title: "Vehicle answers", detail: "<p>The response action can be <code>DEFAULT</code> (Android decides), <code>SWITCH</code> (start this existing user) or <code>CREATE</code> (create a new user, e.g. an unknown fob).</p>" },
    { from: 3, to: 4, kind: "ipc", svg: "start & unlock user 11", label: "Start user 11 as the first full user", title: "Boot straight into Bea", detail: "<p>No intermediate “last user” is shown, so there is no visible switch at boot.</p>" },
    { from: 4, to: 3, kind: "ret", svg: "USER_UNLOCKED(11)", label: "USER_UNLOCKED(11) → bind per-user plug-ins", title: "Ready", detail: "<p>Per-user plug-in services start, push Bea's Android-side preferences to the vehicle, and the cluster follows the active profile.</p>" },
  ];
  SequenceDiagram($("#boot-seq"), { lanes: bootLanes, steps: bootSteps, ariaLabel: "Boot with key fob into the right user", laneW: 196, intro: "Unlock with Bea's key fob and boot directly into her user. Press <b>Next ▶</b>." });
})();
