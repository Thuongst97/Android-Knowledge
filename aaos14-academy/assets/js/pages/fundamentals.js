(function () {
  "use strict";
  const { $, $$, esc, Diagram: D, SequenceDiagram } = window.AAOS;
  /* ------------------------- Process anatomy diagram ------------------------- */
  D.layered($("#hd-process"), {
    id: "anat", label: "Anatomy of an Android app process",
    bands: [
      { key: "app", tag: "PROC", tone: "app", title: ["App process"], sub: ["com.oem.hvac", "UID u10_a123", "forked from Zygote"] },
      { key: "kernel", tag: "KRNL", tone: "native", title: ["Linux kernel"], sub: ["/dev/binder"] },
      { key: "sys", tag: "PROC", tone: "fw", title: ["System", "processes"], sub: ["system_server", "com.android.car"] },
    ],
    nodes: [
      { id: "main", band: "app", at: [0, 0.32], title: "Main thread", sub: "Looper + MessageQueue · UI · lifecycle · Car API callbacks", tag: "Thread", hl: true, tip: "Main thread — runs a Looper: UI, input, lifecycle callbacks and (by default) Car API callbacks. Never block it." },
      { id: "pool", band: "app", at: [0.36, 0.68], title: "Binder thread pool", sub: "binder:<pid>_N · up to 15 extra · concurrent", tag: "IPC", hl: true, tip: "Binder thread pool — incoming AIDL calls and callbacks from other processes run here, concurrently" },
      { id: "workers", band: "app", at: [0.72, 1], title: "Background workers", sub: "HandlerThread · Executor · Dispatchers.IO", tag: "Thread", tip: "Background workers — I/O and long work; results are posted back to the main Looper" },
      { id: "render", band: "app", row: 1, at: [0, 0.32], title: "RenderThread", sub: "GPU drawing", tag: "Thread" },
      { id: "art", band: "app", row: 1, at: [0.72, 1], title: "ART runtime", sub: "shared with Zygote · SELinux domain", tag: "Runtime", soft: true, tip: "ART runtime — classes preloaded by Zygote are shared; the process runs in an SELinux domain such as untrusted_app or priv_app" },

      { id: "binder", band: "kernel", at: [0.36, 0.68], title: "Binder driver", sub: "copies data once · stamps caller UID/PID", tag: "Kernel", tip: "Binder driver — carries every IPC transaction and attaches the caller's real identity" },

      { id: "ss", band: "sys", at: [0, 0.48], title: "system_server", sub: "ActivityManager · WindowManager · PackageManager", tag: "Svc" },
      { id: "car", band: "sys", at: [0.52, 1], title: "CarService", sub: "CarPropertyService · CarAudioService · … → VHAL", tag: "Svc", hl: true },
    ],
    edges: [
      { from: "pool", to: "main", kind: "call", label: "Handler.post" },
      { from: "pool", to: "binder", kind: "ipc", label: "ioctl(BINDER_WRITE_READ)" },
      { from: "binder", to: "ss", kind: "ipc", label: "transaction" },
      { from: "binder", to: "car", kind: "ipc", label: "transaction" },
    ],
  });


  /* ------------------------- Binder call sequence ------------------------- */
  const lanes = [
    { title: "Client code", sub: "app thread", tone: "app" },
    { title: "Proxy", sub: "Stub.Proxy → BpBinder", tone: "app" },
    { title: "Binder driver", sub: "kernel /dev/binder", tone: "native" },
    { title: "Server binder thread", sub: "IPCThreadState · BBinder", tone: "fw" },
    { title: "Service impl", sub: "ITelemetry.Stub", tone: "fw" },
  ];
  const steps = [
    { from: 0, to: 1, kind: "call", svg: "service.lastSpeedKmh()", label: "service.lastSpeedKmh()", title: "Client calls a method on the proxy", detail: "<p>The client holds an <code>ITelemetry</code> obtained from <code>Stub.asInterface(binder)</code>. For a remote object this is a generated <strong>proxy</strong>; to the caller it looks like a normal method call.</p>", code: "val kmh = service.lastSpeedKmh()   // looks local, is remote", codeLang: "kotlin" },
    { from: 1, to: 1, svg: "marshal → Parcel", label: "Write interface token + arguments into a Parcel", title: "Marshalling", detail: "<p>The proxy writes the interface descriptor (a safety check) and every argument into a <code>Parcel</code> — a flat, typed byte buffer. Binder objects inside it are written as references the driver can translate.</p>", code: "_data.writeInterfaceToken(DESCRIPTOR)\n// … write arguments …\nmRemote.transact(TRANSACTION_lastSpeedKmh, _data, _reply, 0)", codeLang: "java" },
    { from: 1, to: 2, kind: "ipc", svg: "ioctl(BINDER_WRITE_READ)", label: "transact() → ioctl(BINDER_WRITE_READ, BC_TRANSACTION)", title: "Into the kernel", detail: "<p><code>BpBinder::transact()</code> hands the Parcel to <code>IPCThreadState</code>, which issues an <code>ioctl</code> on the Binder device. The calling thread now <strong>blocks</strong> waiting for the reply.</p>", tags: [["Kernel boundary", "amber"]] },
    { from: 2, to: 2, kind: "hw", svg: "copy once · stamp uid/pid", label: "Copy data once into the server's mmap'd buffer; record sender UID/PID", title: "The driver does the heavy lifting", detail: "<p>The driver resolves the target handle to the server process, copies the payload <strong>once</strong> into a buffer mapped into that process, translates any Binder references, and records the sender's <strong>UID and PID</strong> — the basis of every permission check.</p>", analogy: "The switchboard operator connects the call and displays a caller ID that the caller cannot change." },
    { from: 2, to: 3, kind: "ipc", svg: "wake binder thread (BR_TRANSACTION)", label: "Wake an idle server binder thread (BR_TRANSACTION)", title: "A server thread picks it up", detail: "<p>One of the server's binder threads, blocked in its own <code>ioctl</code>, wakes up with the transaction. If all threads are busy and the pool is not at its maximum, the driver asks the process to spawn another.</p>" },
    { from: 3, to: 4, kind: "call", svg: "onTransact(code) → impl", label: "BBinder::transact → Stub.onTransact(code) → lastSpeedKmh()", title: "Unmarshal and dispatch", detail: "<p>The generated <code>onTransact()</code> switches on the transaction code, checks the interface token, reads the arguments from the Parcel and calls your implementation — <strong>on this binder thread</strong>.</p>", code: "case TRANSACTION_lastSpeedKmh: {\n    data.enforceInterface(DESCRIPTOR);\n    float _result = this.lastSpeedKmh();\n    reply.writeNoException();\n    reply.writeFloat(_result);\n    return true;\n}", codeLang: "java" },
    { from: 4, to: 4, svg: "check permission · compute", label: "enforceCallingPermission(); compute result", title: "The implementation runs", detail: "<p>Your code can trust <code>Binder.getCallingUid()</code> because the kernel set it. This is exactly how CarService checks car permissions before talking to the VHAL.</p>", tags: [["Security gate", "red"]] },
    { from: 4, to: 2, kind: "ret", svg: "reply Parcel (BC_REPLY)", label: "Write reply Parcel → ioctl(BC_REPLY)", title: "Reply", detail: "<p>The result (or an exception marker) is written into the reply Parcel and sent back through the driver. The server thread returns to the pool.</p>" },
    { from: 2, to: 1, kind: "ret", svg: "wake client (BR_REPLY)", label: "Deliver reply to the blocked client thread (BR_REPLY)", title: "The client wakes up", detail: "<p>The driver copies the reply into the client's buffer and wakes the thread that was blocked in <code>transact()</code>.</p>" },
    { from: 1, to: 0, kind: "ret", svg: "return 42.0f", label: "Unmarshal reply → return value", title: "Back to normal code", detail: "<p>The proxy reads the reply and returns the value — or rethrows a remote exception. With <code>oneway</code>, steps 8–10 don't exist: the client returns as soon as the driver has queued the transaction.</p>", tags: [["oneway skips the reply", "gray"]] },
    { from: 2, to: 0, kind: "ret", svg: "server died → binderDied()", label: "If the server process dies: death notification → binderDied()", title: "Death notifications", detail: "<p>The driver knows when a process holding Binder objects dies. Clients that called <code>linkToDeath()</code> receive <code>binderDied()</code>; pending and future calls fail with <code>DeadObjectException</code>. This is how apps notice a CarService restart.</p>", tags: [["Robustness", "amber"]] },
  ];
  SequenceDiagram($("#binder-seq"), { lanes, steps, ariaLabel: "One Binder transaction step by step", laneW: 196, intro: "Follow one synchronous Binder call from the client's proxy, through the kernel driver, to a server binder thread and back. Press <b>Next ▶</b> or <kbd>→</kbd>." });

  /* ---------------- HandlerThread · Looper · Handler simulator ---------------- */
  const host = $("#looper-sim");
  if (host) {
    const { codeBlockHTML, wireCopy } = window.AAOS;
    const M = (name, when, st) => ({ name, when, st }); // st: "due" | "wait" | "new"
    /* Each step: on = visible components, lit = highlighted ones, ar = active arrows,
       q = MessageQueue contents (sorted by when), th = worker-thread state, t = uptime (ms) */
    const S = [
      { ph: "Initialize", on: [], lit: ["caller"], ar: [], q: [], th: ["new", "NEW · not started"], t: 0, call: 'HandlerThread("vehicle-events")', poll: "", run: "",
        title: "Create the HandlerThread", detail: "A <code>HandlerThread</code> is just a <code>Thread</code> whose <code>run()</code> sets up a Looper. Creating it allocates the Java object only — there is no OS thread, no Looper and no queue yet.",
        code: 'val worker = HandlerThread("vehicle-events")   // Thread object only', file: "VehicleEventWorker.kt" },
      { ph: "Initialize", on: [], lit: ["caller", "thread"], ar: ["start"], q: [], th: ["run", "RUNNABLE · run() starts"], t: 1, call: "worker.start()", poll: "", run: "",
        title: "start() creates the OS thread", detail: "<code>start()</code> asks the kernel for a new thread. The caller returns immediately; <code>run()</code> now executes <strong>on the new thread</strong>, in parallel with the main thread.",
        code: 'worker.start()                                  // returns at once\n// on the new thread:  HandlerThread.run() begins', file: "VehicleEventWorker.kt" },
      { ph: "Initialize", on: ["looper", "queue", "tl"], lit: ["looper", "queue", "tl"], ar: [], q: [], th: ["run", "RUNNABLE · Looper.prepare()"], t: 2, call: "", poll: "", run: "",
        title: "Looper.prepare() — one Looper and one queue per thread", detail: "Inside <code>run()</code>, <code>Looper.prepare()</code> creates a <code>Looper</code>, which creates its <code>MessageQueue</code> (plus a native epoll/eventfd pair used to sleep and wake). The Looper is stored in a <code>ThreadLocal</code>, so <code>Looper.myLooper()</code> on this thread returns it. Calling <code>prepare()</code> twice throws.",
        code: 'public void run() {                         // HandlerThread.java (simplified)\n    Looper.prepare();                       // new Looper → new MessageQueue\n    synchronized (this) {\n        mLooper = Looper.myLooper();        // read back from the ThreadLocal\n        notifyAll();                        // wake anyone blocked in getLooper()\n    }\n    onLooperPrepared();\n    Looper.loop();\n}', file: "HandlerThread.java", lang: "java" },
      { ph: "Initialize", on: ["looper", "queue", "tl", "epoll"], lit: ["looper", "epoll"], ar: ["next"], q: [], th: ["sleep", "WAITING · epoll, no timeout"], t: 3, call: "", poll: "nativePollOnce(-1)", run: "",
        title: "Looper.loop() — the queue is empty, so the thread sleeps", detail: "<code>loop()</code> calls <code>queue.next()</code>. With no messages, <code>next()</code> calls <code>nativePollOnce(-1)</code>: the thread blocks in <strong>epoll with no timeout</strong>. It uses no CPU until someone wakes it.",
        code: 'for (;;) {\n    Message msg = queue.next();        // empty → nativePollOnce(ptr, -1): sleep\n    if (msg == null) return;           // only after quit()\n    msg.target.dispatchMessage(msg);\n    msg.recycleUnchecked();\n}', file: "Looper.java (simplified)", lang: "java" },
      { ph: "Initialize", on: ["looper", "queue", "tl", "epoll"], lit: ["caller", "looper"], ar: ["getlooper"], q: [], th: ["sleep", "WAITING · epoll, no timeout"], t: 4, call: "worker.looper", poll: "nativePollOnce(-1)", run: "",
        title: "getLooper() hands the Looper to the main thread", detail: "Back on the main thread, <code>worker.looper</code> (<code>getLooper()</code>) returns the worker's Looper. If <code>run()</code> had not reached <code>prepare()</code> yet, <code>getLooper()</code> would <code>wait()</code> until the <code>notifyAll()</code> of the previous step — so it is always safe to call right after <code>start()</code>.",
        code: 'val looper = worker.looper     // blocks briefly until the Looper exists', file: "VehicleEventWorker.kt" },
      { ph: "Initialize", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["handler", "looper"], ar: ["bind"], q: [], th: ["sleep", "WAITING · epoll, no timeout"], t: 5, call: "Handler(worker.looper)", poll: "nativePollOnce(-1)", run: "",
        title: "Create a Handler bound to that Looper", detail: "A <code>Handler</code> remembers its Looper and the Looper's <code>MessageQueue</code>. Anything sent through it is <strong>executed on the Looper's thread</strong>, no matter which thread sends it. Always pass the Looper explicitly: the no-arg <code>Handler()</code> constructor is deprecated.",
        code: 'val handler = object : Handler(worker.looper) {\n    override fun handleMessage(msg: Message) {   // runs on "vehicle-events"\n        when (msg.what) {\n            MSG_PARSE -> parseFrame(msg.obj as ByteArray)\n            MSG_FLUSH -> flushToDisk()\n        }\n    }\n}', file: "VehicleEventWorker.kt" },
      { ph: "Send a message", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["caller", "handler", "queue"], ar: ["call", "enq"], q: [M("MSG_PARSE", 1000, "new")], th: ["sleep", "WAITING · epoll, no timeout"], t: 1000, call: "sendMessage(MSG_PARSE)", poll: "nativePollOnce(-1)", run: "",
        title: "sendMessage() → enqueueMessage()", detail: "<code>sendMessage(msg)</code> is <code>sendMessageDelayed(msg, 0)</code> → <code>sendMessageAtTime(msg, uptimeMillis() + 0)</code>. <code>enqueueMessage()</code> sets <code>msg.target = this handler</code> and <code>msg.when = 1000</code>, then inserts the message into the queue, which is a linked list <strong>sorted by <code>when</code></strong>. This runs on the <em>main</em> thread, under the queue's lock.",
        code: 'val msg = handler.obtainMessage(MSG_PARSE, frame)  // reuses a pooled Message\nhandler.sendMessage(msg)\n// → sendMessageAtTime(msg, SystemClock.uptimeMillis())\n// → queue.enqueueMessage(msg, when = 1000)   msg.target = handler', file: "VehicleEventWorker.kt" },
      { ph: "Send a message", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["queue", "epoll"], ar: ["wake"], q: [M("MSG_PARSE", 1000, "due")], th: ["run", "RUNNABLE · woken up"], t: 1000, call: "", poll: "nativeWake()", run: "",
        title: "The new head of the queue wakes the thread", detail: "The message became the <strong>head</strong> of the queue and the Looper thread is blocked, so <code>enqueueMessage()</code> calls <code>nativeWake()</code>: it writes to the eventfd and epoll returns. If the thread were busy, or the message went behind an earlier one, no wake-up would be needed.",
        code: 'if (p == null || when == 0 || when < p.when) {  // new head of the list\n    msg.next = p; mMessages = msg;\n    needWake = mBlocked;                        // the thread is sleeping\n}\nif (needWake) nativeWake(mPtr);                 // write(eventfd) → epoll returns', file: "MessageQueue.enqueueMessage() (simplified)", lang: "java" },
      { ph: "Send a message", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["queue", "looper"], ar: ["next"], q: [], th: ["run", "RUNNABLE · next() returns"], t: 1000, call: "", poll: "", run: "",
        title: "next() pops the due message", detail: "<code>next()</code> looks at the head: <code>when (1000) ≤ now (1000)</code>, so it unlinks the message and returns it to <code>loop()</code>. Messages leave the queue strictly in <code>when</code> order.",
        code: 'final long now = SystemClock.uptimeMillis();\nif (msg != null && now >= msg.when) {\n    mMessages = msg.next;                // unlink the head\n    return msg;                          // → Looper.loop()\n}', file: "MessageQueue.next() (simplified)", lang: "java" },
      { ph: "Send a message", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["looper", "run"], ar: ["disp"], q: [], th: ["busy", "RUNNABLE · handleMessage()"], t: 1001, call: "", poll: "", run: "handleMessage(MSG_PARSE)",
        title: "dispatchMessage() → handleMessage() on the worker thread", detail: "<code>loop()</code> calls <code>msg.target.dispatchMessage(msg)</code>. If the message carries a Runnable (from <code>post()</code>) it runs that; otherwise it calls your <code>handleMessage()</code>. Your code runs <strong>on \"vehicle-events\"</strong>, one message at a time — so state touched only here needs no locks.",
        code: 'public void dispatchMessage(Message msg) {\n    if (msg.callback != null) msg.callback.run();     // post(Runnable)\n    else if (mCallback != null && mCallback.handleMessage(msg)) return;\n    else handleMessage(msg);                          // your override\n}', file: "Handler.java", lang: "java" },
      { ph: "Send a message", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["looper", "epoll"], ar: ["next"], q: [], th: ["sleep", "WAITING · epoll, no timeout"], t: 1003, call: "", poll: "nativePollOnce(-1)", run: "",
        title: "Recycle the Message, then sleep again", detail: "After <code>handleMessage()</code> returns, <code>loop()</code> recycles the Message into the global pool (that is why you use <code>obtainMessage()</code>) and calls <code>next()</code> again. The queue is empty, so the thread goes back to sleep.",
        code: 'msg.recycleUnchecked();      // back to the Message pool — never touch msg after this\n// next() → empty → nativePollOnce(-1)', file: "Looper.java (simplified)", lang: "java" },
      { ph: "sendMessageDelayed", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["caller", "handler", "queue"], ar: ["call", "enq"], q: [M("MSG_FLUSH", 4000, "new")], th: ["sleep", "WAITING · epoll, no timeout"], t: 2000, call: "sendMessageDelayed(…, 2000)", poll: "nativePollOnce(-1)", run: "",
        title: "sendMessageDelayed(MSG_FLUSH, 2000)", detail: "A delay is not a timer: it is just a later <code>when</code>. At uptime 2000, <code>sendMessageDelayed(msg, 2000)</code> becomes <code>sendMessageAtTime(msg, 2000 + 2000)</code>, so the message is enqueued <strong>now</strong> with <code>when = 4000</code>.",
        code: 'handler.sendMessageDelayed(handler.obtainMessage(MSG_FLUSH), 2_000)\n// → sendMessageAtTime(msg, uptimeMillis() + 2000)  →  when = 4000', file: "VehicleEventWorker.kt" },
      { ph: "sendMessageDelayed", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["queue", "epoll"], ar: ["next"], q: [M("MSG_FLUSH", 4000, "wait")], th: ["sleep", "TIMED_WAITING · epoll 2000 ms"], t: 2000, call: "", poll: "nativePollOnce(2000)", run: "",
        title: "Not due yet → sleep with a timeout", detail: "The thread was woken (new head), but <code>next()</code> sees <code>when (4000) &gt; now (2000)</code>. It computes <code>nextPollTimeoutMillis = 4000 − 2000 = 2000</code> and sleeps in epoll <strong>with that timeout</strong>. The message stays in the queue.",
        code: 'if (now < msg.when) {\n    nextPollTimeoutMillis = (int) Math.min(msg.when - now, Integer.MAX_VALUE);\n}\n// loop around → nativePollOnce(mPtr, 2000)', file: "MessageQueue.next() (simplified)", lang: "java" },
      { ph: "sendMessageDelayed", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["caller", "handler", "queue", "epoll"], ar: ["call", "enq", "wake"], q: [M("MSG_PARSE", 2500, "due"), M("MSG_FLUSH", 4000, "wait")], th: ["run", "RUNNABLE · woken up"], t: 2500, call: "sendMessage(MSG_PARSE)", poll: "nativeWake()", run: "",
        title: "A newer message jumps ahead of the delayed one", detail: "At 2500 a normal <code>sendMessage()</code> arrives with <code>when = 2500</code>. Because 2500 &lt; 4000 it is inserted <strong>before</strong> MSG_FLUSH and becomes the new head, so <code>nativeWake()</code> cuts the 2000 ms sleep short. Order is by <code>when</code>, not by the time of sending.",
        code: 'handler.sendMessage(handler.obtainMessage(MSG_PARSE, frame))   // when = 2500\n// queue:  MSG_PARSE(2500) → MSG_FLUSH(4000)', file: "VehicleEventWorker.kt" },
      { ph: "sendMessageDelayed", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["looper", "run"], ar: ["next", "disp"], q: [M("MSG_FLUSH", 4000, "wait")], th: ["busy", "RUNNABLE · handleMessage()"], t: 2500, call: "", poll: "", run: "handleMessage(MSG_PARSE)",
        title: "The due message runs first", detail: "<code>next()</code> returns MSG_PARSE and it is handled on the worker thread. MSG_FLUSH is still waiting for its time.",
        code: '// handleMessage(MSG_PARSE) on "vehicle-events"\nparseFrame(msg.obj as ByteArray)', file: "VehicleEventWorker.kt" },
      { ph: "sendMessageDelayed", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["queue", "epoll"], ar: ["next"], q: [M("MSG_FLUSH", 4000, "wait")], th: ["sleep", "TIMED_WAITING · epoll 1490 ms"], t: 2510, call: "", poll: "nativePollOnce(1490)", run: "",
        title: "Recompute the timeout and sleep again", detail: "Handling took 10 ms. <code>next()</code> recomputes the timeout from the head: <code>4000 − 2510 = 1490 ms</code>. A late message is never early: if <code>handleMessage()</code> blocks, every message behind it (and on the main thread, every input event) is delayed.",
        code: '// next(): head = MSG_FLUSH(4000), now = 2510\n// nativePollOnce(mPtr, 1490)', file: "MessageQueue.next() (simplified)", lang: "java" },
      { ph: "sendMessageDelayed", on: ["looper", "queue", "tl", "epoll", "handler"], lit: ["looper", "run", "epoll"], ar: ["next", "disp"], q: [], th: ["busy", "RUNNABLE · handleMessage()"], t: 4000, call: "", poll: "timeout expired", run: "handleMessage(MSG_FLUSH)",
        title: "The timeout expires → the delayed message runs", detail: "At uptime 4000 epoll returns on its own (nothing had to wake it). <code>next()</code> finds MSG_FLUSH due and <code>handleMessage(MSG_FLUSH)</code> runs. <strong>Uptime</strong> does not advance in deep sleep: if the car suspends, a delayed message fires only after resume.",
        code: '// SystemClock.uptimeMillis() pauses during Suspend-to-RAM —\n// use AlarmManager / JobScheduler for work that must survive sleep', file: "Note", lang: "kotlin" },
      { ph: "Quit", on: ["looper", "queue", "tl", "handler"], lit: ["caller", "looper", "queue"], ar: ["quit"], q: [], th: ["dead", "TERMINATED"], t: 4200, call: "worker.quitSafely()", poll: "", run: "",
        title: "quitSafely() ends the loop and the thread", detail: "<code>quitSafely()</code> drops messages scheduled for the future, lets already-due ones finish, then makes <code>next()</code> return <code>null</code>. <code>loop()</code> returns, <code>run()</code> ends and the thread terminates. Messages sent afterwards are rejected (<code>sendMessage()</code> returns <code>false</code>). <code>quit()</code> drops everything at once.",
        code: 'worker.quitSafely()   // next() → null → loop() returns → thread ends\nhandler.sendMessage(msg)   // false: "sending message to a Handler on a dead thread"', file: "VehicleEventWorker.kt" },
    ];

    // ---- static SVG (970 × 400)
    const box = (id, x, y, w, h, tone, title, sub, extra = "") => `<g class="ls-node tn-${tone}" data-n="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>` +
      `<text class="ls-t" x="${x + 14}" y="${y + 22}">${title}</text>${sub ? `<text class="ls-s" x="${x + 14}" y="${y + 38}">${sub}</text>` : ""}${extra}</g>`;
    const AR = {
      start: ["M236,46 H500", "start()"], getlooper: ["M520,76 C430,76 330,100 236,100", "getLooper()"],
      call: ["M224,214 H286", ""], bind: ["M376,174 C376,124 450,106 520,106", "Handler(looper)"],
      enq: ["M466,214 H520", "enqueue"], wake: ["M376,254 C376,300 440,318 520,318", "nativeWake()"],
      next: ["M742,160 V128", "next()"], disp: ["M942,96 C968,96 968,318 942,318", "dispatch"],
      quit: ["M236,354 H500", "quitSafely()"],
    };
    // an arrow is drawn only once the components at both of its ends exist
    const AR_NEEDS = { getlooper: ["looper"], call: ["handler"], bind: ["handler", "looper"], enq: ["handler", "queue"], wake: ["handler", "epoll"], next: ["looper"], disp: ["looper"] };
    let svg = `<defs><marker id="ls-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z"/></marker></defs>`;
    svg += `<g class="ls-node ls-lane tn-app" data-n="caller"><rect x="16" y="16" width="220" height="368" rx="12"/><text class="ls-t" x="32" y="42">Main thread</text><text class="ls-s" x="32" y="58">your code (any thread can send)</text>` +
      `<g class="ls-callg"><rect class="ls-callbox" x="28" y="194" width="196" height="40" rx="8"/><text class="ls-call" x="126" y="218" text-anchor="middle"></text></g></g>`;
    svg += `<g class="ls-node ls-lane tn-fw" data-n="thread"><rect x="500" y="16" width="454" height="368" rx="12"/><text class="ls-t" x="516" y="42">HandlerThread "vehicle-events"</text>` +
      `<g class="ls-state"><rect x="752" y="26" width="188" height="22" rx="11"/><text x="846" y="41" text-anchor="middle"></text></g></g>`;
    svg += box("looper", 520, 60, 422, 68, "fw", "Looper", "loop(): for (;;) { next() → dispatchMessage() }");
    svg += box("queue", 520, 160, 422, 112, "app", "MessageQueue", "linked list sorted by msg.when (uptime)", `<g class="ls-q"></g>`);
    svg += box("epoll", 520, 292, 200, 52, "native", "epoll / eventfd", "", `<text class="ls-s ls-poll" x="534" y="330"></text>`);
    svg += box("run", 732, 292, 210, 52, "hal", "handleMessage()", "", `<text class="ls-s ls-run" x="746" y="330"></text>`);
    svg += `<g class="ls-node ls-tl" data-n="tl"><text class="ls-s" x="520" y="370">ThreadLocal: Looper.myLooper() on this thread → this Looper</text></g>`;
    svg += box("handler", 286, 174, 180, 80, "hal", "Handler", "mLooper · mQueue", `<text class="ls-s" x="300" y="240">handleMessage() override</text>`);
    Object.entries(AR).forEach(([k, [d, label]]) => {
      svg += `<g class="ls-ar" data-a="${k}"><path id="ls-p-${k}" d="${d}" marker-end="url(#ls-ah)"/>${label ? `<text class="ls-al" data-a="${k}"></text>` : ""}</g>`;
    });

    host.innerHTML = `
      <div class="ls-top">
        <div class="ls-phases">${[...new Set(S.map((s) => s.ph))].map((p) => `<span data-ph="${esc(p)}">${esc(p)}</span>`).join("")}</div>
        <span class="ls-clock mono">uptime <b id="ls-clock">0</b> ms</span>
      </div>
      <div class="ls-canvas"><svg class="ls-svg" viewBox="0 0 970 400" role="img" aria-label="HandlerThread, Looper, MessageQueue and Handler working together">${svg}</svg></div>
      <div class="sf-controls">
        <button class="btn sm" data-ls="reset">⟲ Reset</button>
        <button class="btn sm" data-ls="prev">◀ Prev</button>
        <button class="btn sm primary" data-ls="play">▶ Play</button>
        <button class="btn sm" data-ls="next">Next ▶</button>
        <span class="sf-count" id="ls-count"></span>
      </div>
      <div class="sf-detail" id="ls-detail"></div>`;

    const svgEl = $("svg", host);
    // label each arrow at its path midpoint
    Object.keys(AR).forEach((k) => {
      const p = $(`#ls-p-${k}`, host), t = $(`.ls-al[data-a="${k}"]`, host);
      if (!t || !p.getTotalLength) return;
      const L = p.getTotalLength(), m = p.getPointAtLength(L / 2);
      const vertical = Math.abs(p.getPointAtLength(0).x - p.getPointAtLength(L).x) < 4;
      t.setAttribute("x", m.x + (vertical ? 8 : 0)); t.setAttribute("y", m.y - (vertical ? -4 : 6));
      if (!vertical) t.setAttribute("text-anchor", "middle");
      t.textContent = AR[k][1];
    });
    const qG = $(".ls-q", host), callT = $(".ls-call", host), stateG = $(".ls-state", host), pollT = $(".ls-poll", host), runT = $(".ls-run", host);
    const clock = $("#ls-clock", host), count = $("#ls-count", host), detail = $("#ls-detail", host), playBtn = $('[data-ls="play"]', host);
    let cur = -1, timer = null, pulses = [];

    function render() {
      const s = S[cur] || { on: [], lit: [], ar: [], q: [], th: ["new", "not created"], t: 0, call: "", poll: "", run: "" };
      const vis = new Set(["caller", "thread", ...s.on]);
      if (vis.has("looper")) vis.add("run"); // handleMessage() exists as soon as the loop does
      svgEl.classList.toggle("ls-dim", cur >= 0);
      $$(".ls-node", host).forEach((g) => {
        const n = g.dataset.n;
        g.classList.toggle("off", !vis.has(n));
        g.classList.toggle("lit", s.lit.includes(n));
      });
      $('[data-n="thread"]', host).classList.toggle("dead", s.th[0] === "new" || s.th[0] === "dead");
      pulses.forEach((p) => p.remove()); pulses = [];
      $$(".ls-ar", host).forEach((g) => {
        const on = s.ar.includes(g.dataset.a);
        g.classList.toggle("on", on);
        g.classList.toggle("off", !on && !(AR_NEEDS[g.dataset.a] || []).every((n) => vis.has(n)));
        if (on) { const p = D.attachPulse($("path", g), "", 1.3); if (p) pulses.push(p); }
      });
      callT.textContent = s.call; $(".ls-callg", host).classList.toggle("off", !s.call);
      stateG.setAttribute("class", "ls-state " + s.th[0]); $("text", stateG).textContent = s.th[1];
      pollT.textContent = s.poll || "idle"; runT.textContent = s.run || "—";
      qG.innerHTML = s.q.length ? s.q.map((m, i) => {
        const x = 534 + i * 138, due = m.st === "due" ? "due now" : m.st === "new" ? "just enqueued" : `in ${m.when - s.t} ms`;
        return `<g class="ls-msg ${m.st}"><rect x="${x}" y="204" width="128" height="54" rx="8"/><text class="ls-mn" x="${x + 10}" y="224">${m.name}</text>` +
          `<text class="ls-s" x="${x + 10}" y="240">when = ${m.when}</text><text class="ls-s ls-due" x="${x + 10}" y="252">${due}</text></g>` +
          (i < s.q.length - 1 ? `<path class="ls-link" d="M${x + 128},231 H${x + 138}"/>` : "");
      }).join("") : `<text class="ls-s ls-empty" x="534" y="236">${vis.has("queue") ? "empty" : ""}</text>`;
      clock.textContent = s.t;
      $$("[data-ph]", host).forEach((p) => p.classList.toggle("on", !!S[cur] && p.dataset.ph === s.ph));
      count.textContent = `${cur + 1} / ${S.length}`;
      if (cur < 0) {
        detail.innerHTML = `<div><span class="badge gray">Ready</span><h4>From new HandlerThread() to handleMessage()</h4><p class="small muted">Press ▶ Play or Next ▶ (or use ← →). The simulation creates a worker thread, sets up its Looper, binds a Handler, sends a message, then shows how <code>sendMessageDelayed()</code> is ordered and timed.</p></div>
          <div class="callout analogy" style="margin:0"><div class="ci">🎭</div><div><span class="ct">Analogy</span><p>The HandlerThread is a kitchen with one chef (the Looper). The order rail (MessageQueue) is sorted by the time each dish is due. Waiters (Handlers) can clip orders onto the rail from anywhere; a delayed order is just one clipped further along the rail.</p></div></div>`;
        return;
      }
      detail.innerHTML = `<div><span class="badge">${esc(s.ph)}</span> <span class="badge gray">${esc(s.th[1])}</span>
          <h4>${cur + 1}. ${esc(s.title)}</h4><p class="small">${s.detail}</p></div>
        <div>${codeBlockHTML({ code: s.code, lang: s.lang || "kotlin", file: s.file, label: s.lang === "java" ? "Java" : "Kotlin" })}</div>`;
      wireCopy(detail);
    }
    const go = (i) => { cur = Math.max(-1, Math.min(S.length - 1, i)); render(); };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = "▶ Play"; };
    const play = () => {
      if (timer) return stop();
      if (cur >= S.length - 1) go(-1);
      playBtn.textContent = "⏸ Pause";
      go(cur + 1);
      timer = setInterval(() => (cur >= S.length - 1 ? stop() : go(cur + 1)), 2600);
    };
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ls]");
      if (!b) return;
      const a = b.dataset.ls;
      if (a === "play") return play();
      stop();
      if (a === "next") go(cur + 1);
      if (a === "prev") go(cur - 1);
      if (a === "reset") go(-1);
    });
    host.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { stop(); go(cur + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { stop(); go(cur - 1); e.preventDefault(); }
    });
    host.tabIndex = 0;
    render();
  }
})();
