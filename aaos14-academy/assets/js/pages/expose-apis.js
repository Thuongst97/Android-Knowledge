/* Exposing APIs with Intents & AIDL — scenario map, Intent request/reply flow, AIDL bind and call flow */
(function () {
  "use strict";
  const { $, Diagram: D, SequenceDiagram } = window.AAOS;

  /* ---------- 13.1 Scenario ---------- */
  D.layered($("#hd-expose"), {
    id: "expose", label: "Service_A exposes an Intent API to App_B and an AIDL API to Service_C",
    bands: [
      { key: "clients", tag: "L1", title: ["Client apps"], sub: ["App_B · Service_C"] },
      { key: "sys", tag: "L2", title: ["system_server"], sub: ["resolve · check", "deliver · bind"] },
      { key: "provider", tag: "APP", tone: "app", title: ["Service_A app"], sub: ["com.example.servicea"] },
      { key: "kernel", tag: "KRNL", tone: "native", title: ["Linux kernel"], sub: ["/dev/binder"] },
    ],
    nodes: [
      { id: "appb", band: "clients", at: [0, 0.4], title: "App_B", sub: "com.example.appb · Intent client", tag: "App", tip: "App_B — sends REQUEST_TRIP_SUMMARY, listens for TRIP_ENDED, opens SHOW_TRIP" },
      { id: "svcc", band: "clients", at: [0.66, 1], title: "Service_C", sub: "FleetSyncService · AIDL client", tag: "App", tip: "Service_C — binds TripApiService and calls ITripService directly" },

      { id: "ams", band: "sys", at: [0, 0.4], title: "ActivityManagerService", sub: "broadcasts · PendingIntents · bindings", tag: "Svc", hl: true, tip: "AMS — delivers every Intent and sets up every binding, checking permissions on the way" },
      { id: "pms", band: "sys", at: [0.43, 0.63], title: "PackageManager", sub: "resolve · visibility", tag: "Svc", tip: "PMS — resolves the Intent to a component and applies package visibility" },

      { id: "rcv", band: "provider", at: [0, 0.3], title: "ApiReceiver", sub: "REQUEST_TRIP_SUMMARY", tag: "App", tip: "Exported BroadcastReceiver protected by READ_TRIPS" },
      { id: "act", band: "provider", at: [0.33, 0.63], title: "TripActivity", sub: "SHOW_TRIP", tag: "App", tip: "Exported Activity protected by READ_TRIPS" },
      { id: "api", band: "provider", at: [0.66, 1], title: "TripApiService", sub: "ITripService.Stub · listeners", tag: "App", hl: true, tip: "Exported bound service protected by BIND_TRIP_API" },

      { id: "binder", band: "kernel", at: [0, 1], title: "Binder driver", sub: "carries every arrow marked Binder — with the caller's UID", tag: "Kernel" },
    ],
    edges: [
      { from: "appb", to: "ams", kind: "ipc", label: "sendBroadcast" },
      { from: "ams", to: "pms", kind: "call", label: "resolve" },
      { from: "ams", to: "rcv", kind: "ipc", label: "onReceive" },
      { from: "ams", to: "act", kind: "ipc" },
      { from: "svcc", to: "ams", kind: "ipc", label: "bindService" },
      { from: "ams", to: "api", kind: "ipc", label: "onBind" },
      { from: "svcc", to: "api", kind: "ipc", label: "ITripService", marker: "AIDL" },
    ],
  });

  /* ---------- 13.3 Intent request / reply ---------- */
  SequenceDiagram($("#intent-seq"), {
    lanes: [
      { title: "App_B", sub: "TripClient · TripReplyReceiver", tone: "app" },
      { title: "ActivityManagerService", sub: "system_server", tone: "fw" },
      { title: "PackageManagerService", sub: "system_server", tone: "fw" },
      { title: "Service_A", sub: "ApiReceiver · worker", tone: "app" },
    ],
    laneW: 216,
    ariaLabel: "Intent API: request, reply through a PendingIntent, and an event broadcast",
    intro: "App_B asks for the summary of trip 42, gets the answer through its PendingIntent, and later receives a TRIP_ENDED event. Press <b>Next ▶</b> or <kbd>→</kbd>.",
    steps: [
      { from: 0, to: 1, kind: "ipc", svg: "getBroadcast() → IIntentSender", label: "App_B creates the reply PendingIntent", title: "Create the reply PendingIntent",
        detail: "<p>A <code>PendingIntent</code> is a token held by AMS: <code>getBroadcast()</code> asks AMS to store the Intent (explicit, pointing at <code>TripReplyReceiver</code>) together with App_B's identity, and returns a reference to it. Whoever later sends it acts <em>as App_B</em>.</p>", tags: [["Binder", "blue"]] },
      { from: 0, to: 1, kind: "ipc", svg: "sendBroadcast(request)", label: "sendBroadcast(request) — explicit, with TRIP_ID and the reply", title: "Send the request",
        detail: "<p>The request carries <code>EXTRA_TRIP_ID</code> and <code>EXTRA_REPLY</code>, and <code>setPackage(\"com.example.servicea\")</code> limits delivery to Service_A. Because a package is set, Android 8's limit on implicit broadcasts does not apply and the manifest receiver gets it.</p>",
        code: "context.sendBroadcast(\n    Intent(TripApi.ACTION_REQUEST_TRIP_SUMMARY)\n        .setPackage(TripApi.PACKAGE)\n        .putExtra(TripApi.EXTRA_TRIP_ID, 42L)\n        .putExtra(TripApi.EXTRA_REPLY, reply))", codeLang: "kotlin" },
      { from: 1, to: 2, kind: "call", svg: "queryIntentReceivers()", label: "Resolve the receivers, filtered by App_B's package visibility", title: "Who receives it?",
        detail: "<p>AMS asks PMS for receivers matching the action in package <code>com.example.servicea</code>. PMS only returns components App_B is allowed to <em>see</em> — without <code>&lt;queries&gt;</code> the list is empty and the broadcast goes nowhere.</p>" },
      { from: 1, to: 1, kind: "call", svg: "check READ_TRIPS · enqueue", label: "Check the receiver's permission, queue a BroadcastRecord", title: "Permission check",
        detail: "<p>The receiver declares <code>android:permission=\"…READ_TRIPS\"</code>. AMS checks that App_B's UID holds it. If not, it logs <code>Permission Denial: broadcasting Intent … requires …READ_TRIPS</code> and skips the receiver — the sender gets no error. Otherwise a <code>BroadcastRecord</code> is queued.</p>", tags: [["Security", "red"]] },
      { from: 1, to: 3, kind: "ipc", svg: "start process · scheduleReceiver()", label: "Start Service_A's process if needed; call onReceive()", title: "Deliver to ApiReceiver",
        detail: "<p>If Service_A is not running, AMS starts its process through Zygote (<a href=\"services.html#ams\">12.2</a>). It then calls <code>scheduleReceiver()</code>; Service_A instantiates <code>ApiReceiver</code> and runs <code>onReceive()</code> on its main thread.</p>" },
      { from: 3, to: 3, kind: "call", svg: "validate · goAsync() · worker", label: "Validate the extras, goAsync(), query the trip on a worker thread", title: "Do the work off the main thread",
        detail: "<p>The receiver validates <code>EXTRA_TRIP_ID</code>, calls <code>goAsync()</code> so the broadcast stays open after <code>onReceive()</code> returns, and reads the trip on a background executor. The whole receiver must finish within about 10 s or AMS reports an ANR.</p>" },
      { from: 3, to: 1, kind: "ipc", svg: "reply.send(ctx, 0, resultIntent)", label: "Send the client's PendingIntent with result extras", title: "Answer through the PendingIntent",
        detail: "<p><code>reply.send(context, 0, result)</code> asks AMS to fire the PendingIntent. Because App_B made it <code>FLAG_MUTABLE</code>, AMS merges Service_A's extras (<code>STATUS</code>, <code>DISTANCE_M</code>, <code>DURATION_S</code>) into it; the target component stays the one App_B chose.</p>", tags: [["Binder", "blue"]] },
      { from: 1, to: 0, kind: "ret", svg: "TripReplyReceiver.onReceive()", label: "AMS delivers the reply to App_B's own receiver, as App_B", title: "App_B gets the answer",
        detail: "<p>The broadcast runs with App_B's identity, so even its <em>non-exported</em> <code>TripReplyReceiver</code> receives it. App_B reads the status and the values and updates its UI.</p>" },
      { from: 3, to: 1, kind: "ret", svg: "pendingResult.finish()", label: "Service_A finishes the broadcast", title: "Close the broadcast",
        detail: "<p><code>finish()</code> (in a <code>finally</code>) tells AMS the receiver is done. Service_A's process loses its temporary importance and can be cached or killed later — the API keeps no connection.</p>" },
      { from: 3, to: 1, kind: "ipc", svg: "sendBroadcast(TRIP_ENDED, READ_TRIPS)", label: "Later: Service_A broadcasts TRIP_ENDED to holders of READ_TRIPS", title: "An event",
        detail: "<p>When a trip ends, Service_A sends an implicit broadcast with a receiver permission. Only receivers registered at runtime get implicit broadcasts, and only in apps holding <code>READ_TRIPS</code>.</p>" },
      { from: 1, to: 0, kind: "ret", svg: "tripEnded.onReceive()", label: "Delivered to App_B's runtime receiver (sender holds SEND_TRIP_EVENTS)", title: "App_B is told",
        detail: "<p>App_B registered with <code>RECEIVER_EXPORTED</code> and the broadcast permission <code>SEND_TRIP_EVENTS</code>, so AMS delivers only if the <em>sender</em> holds it — a fake <code>TRIP_ENDED</code> from another app is dropped.</p>", tags: [["Security", "red"]] },
    ],
  });

  /* ---------- 13.6 AIDL bind and call ---------- */
  SequenceDiagram($("#aidl-seq"), {
    lanes: [
      { title: "Service_C", sub: "FleetSyncService", tone: "app" },
      { title: "ActivityManagerService", sub: "system_server", tone: "fw" },
      { title: "Service_A main thread", sub: "TripApiService", tone: "app" },
      { title: "Service_A Binder threads", sub: "ITripService.Stub", tone: "app" },
    ],
    laneW: 216,
    ariaLabel: "AIDL API: binding, direct calls, callbacks and recovery from a crash",
    intro: "Service_C binds Service_A, calls it directly, receives callbacks — and survives a crash of Service_A. Press <b>Next ▶</b> or <kbd>→</kbd>.",
    steps: [
      { from: 0, to: 1, kind: "ipc", svg: "bindService(BIND_TRIP_API)", label: "bindService() with an explicit Intent", title: "Ask for a binding",
        detail: "<p>Service_C calls <code>bindService()</code> with the bind action and <code>setPackage()</code>. The call returns <code>true</code> immediately if the service was found and allowed; the binder arrives later in <code>onServiceConnected()</code>.</p>", tags: [["Binder", "blue"]] },
      { from: 1, to: 1, kind: "call", svg: "resolve · exported · BIND_TRIP_API", label: "Resolve, check visibility, exported flag and permission; record the connection", title: "Checks",
        detail: "<p>AMS (<code>ActiveServices</code>) resolves the Intent through PMS, checks package visibility, <code>android:exported</code> and the service's <code>android:permission</code>. It creates a <code>ServiceRecord</code> and a <code>ConnectionRecord</code>; from now on Service_A is at least as important as Service_C for the low-memory killer.</p>" },
      { from: 1, to: 2, kind: "ipc", svg: "onCreate() · onBind(intent)", label: "Start the process if needed; onCreate(), then onBind()", title: "Service_A creates the service",
        detail: "<p>AMS starts Service_A's process if needed and calls <code>onCreate()</code>, then <code>onBind()</code>, which returns the <code>ITripService.Stub</code>. <code>onBind()</code> runs once per Intent; later clients get the cached binder without calling it again.</p>" },
      { from: 2, to: 1, kind: "ipc", svg: "publishService(binder)", label: "The binder is published to AMS", title: "Publish",
        detail: "<p>Service_A's <code>ActivityThread</code> hands the binder to AMS with <code>publishService()</code>. The Binder driver turns the local object into a reference AMS can pass on.</p>" },
      { from: 1, to: 0, kind: "ret", svg: "onServiceConnected(binder)", label: "AMS delivers the binder: onServiceConnected()", title: "Connected",
        detail: "<p>On Service_C's main thread, <code>ITripService.Stub.asInterface(binder)</code> returns a <code>Proxy</code>. From here on AMS is not involved in the calls.</p>" },
      { from: 0, to: 3, kind: "ipc", svg: "apiVersion · registerListener()", label: "Check the version, register the callback (from a worker thread)", title: "First direct calls",
        detail: "<p>Each call is one Binder transaction straight into Service_A, executed on one of its Binder threads. <code>Binder.getCallingUid()</code> there is Service_C's UID, so <code>enforceCallingPermission()</code> works. <code>RemoteCallbackList.register()</code> links to the listener's death.</p>" },
      { from: 0, to: 3, kind: "ipc", svg: "getTripSummary(42)", label: "Synchronous query: the caller blocks until the reply", title: "A blocking call",
        detail: "<p>Service_C's worker thread blocks in the kernel while Service_A validates the ID and reads the trip; the generated code returns a <code>TripSummary</code> or re-throws the server's <code>IllegalArgumentException</code>.</p>",
        code: "val summary = trips?.getTripSummary(42L)   // worker thread\n// → TripSummary(tripId=42, distanceMeters=18450, durationSeconds=1260)", codeLang: "kotlin", tags: [["Blocking", "amber"]] },
      { from: 3, to: 0, kind: "ret", svg: "onTripUpdated(summary) — oneway", label: "Service_A pushes an update through the oneway callback", title: "Callback",
        detail: "<p>Service_A's worker loops over the <code>RemoteCallbackList</code>. <code>onTripUpdated()</code> is <code>oneway</code>: Service_A does not wait. It arrives on a Binder thread of Service_C, which posts it to its own handler.</p>" },
      { from: 1, to: 0, kind: "ret", svg: "onServiceDisconnected()", label: "Service_A crashes: in-flight calls throw DeadObjectException; onServiceDisconnected()", title: "The server dies",
        detail: "<p>When Service_A's process dies, the Binder driver sends death notifications. Calls in progress fail with <code>DeadObjectException</code>, AMS calls <code>onServiceDisconnected()</code>, and Service_A's <code>RemoteCallbackList</code> is gone with its process.</p>", tags: [["Resilience", "amber"]] },
      { from: 1, to: 0, kind: "ret", svg: "onServiceConnected() again", label: "BIND_AUTO_CREATE: AMS restarts Service_A and reconnects", title: "Automatic reconnect",
        detail: "<p>Because the binding still exists with <code>BIND_AUTO_CREATE</code>, AMS restarts the service (with a back-off) and calls <code>onServiceConnected()</code> with a new binder. Service_C must register its listener again — the new process knows nothing about the old one.</p>" },
      { from: 0, to: 1, kind: "ipc", svg: "unbindService()", label: "Service_C unbinds; the last client leaving destroys the service", title: "Clean-up",
        detail: "<p>On <code>unbindService()</code>, AMS removes the connection. With no clients left (and not started), Service_A gets <code>onUnbind()</code> and <code>onDestroy()</code>, and its process can be cached.</p>" },
    ],
  });
})();
