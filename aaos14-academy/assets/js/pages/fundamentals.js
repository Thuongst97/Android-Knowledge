(function () {
  "use strict";
  const { $, esc, Diagram: D, SequenceDiagram } = window.AAOS;
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

  /* ------------------------- Looper simulator ------------------------- */
  const host = $("#looper-sim");
  host.innerHTML = `
    <div class="lp-controls">
      <button class="btn sm" data-a="post">post(Runnable)</button>
      <button class="btn sm" data-a="delay">postDelayed(+1500 ms)</button>
      <button class="btn sm" data-a="front">postAtFrontOfQueue</button>
      <button class="btn sm" data-a="input">👆 Touch event</button>
      <button class="btn sm" data-a="heavy">🐢 Heavy work on main (6 s)</button>
      <button class="btn sm ghost" data-a="reset">⟲ Reset</button>
    </div>
    <div class="lp-grid">
      <div>
        <div class="lp-label">Main thread · uptime <span class="mono" id="lp-clock">0 ms</span></div>
        <div class="lp-thread" id="lp-thread"></div>
        <div class="lp-label" style="margin-top:14px">MessageQueue (ordered by due time)</div>
        <div class="lp-queue" id="lp-queue"></div>
      </div>
      <div>
        <div class="lp-label">Log</div>
        <div class="lp-log" id="lp-log"></div>
      </div>
    </div>
    <div class="lp-anr" id="lp-anr" hidden>⚠️ <b>ANR</b> — “HVAC isn't responding”. A touch event waited more than 5 s because the main thread was busy. <span class="small">Move heavy work to a worker thread.</span></div>`;

  const TICK_REAL = 50, TICK_SIM = 100, ANR_MS = 5000;
  let now = 0, seq = 0, queue = [], current = null, log = [], anrShown = false;
  const clock = $("#lp-clock", host), thread = $("#lp-thread", host), qEl = $("#lp-queue", host), logEl = $("#lp-log", host), anrEl = $("#lp-anr", host);

  function enqueue(label, when, duration, kind, front) {
    const item = { id: ++seq, label, when, duration, kind, posted: now };
    if (front) queue.unshift({ ...item, when: 0 });
    else {
      const i = queue.findIndex((q) => q.when > when);
      if (i < 0) queue.push(item); else queue.splice(i, 0, item);
    }
    addLog(`enqueue ${label} (due ${front ? "now, at front" : "t=" + when + " ms"})`);
  }
  function addLog(text) { log.push(`<div><span class="t">${String(now).padStart(6, " ")} ms</span> ${esc(text)}</div>`); if (log.length > 60) log.shift(); }

  function tick() {
    now += TICK_SIM;
    if (current && now >= current.end) { addLog(`done   ${current.label}`); current = null; }
    if (!current) {
      const head = queue[0];
      if (head && head.when <= now) {
        queue.shift();
        current = { ...head, start: now, end: now + head.duration };
        const waited = now - head.posted;
        addLog(`run    ${head.label}${head.kind === "input" ? ` (waited ${waited} ms)` : ""}`);
      }
    }
    const waitingInput = queue.find((q) => q.kind === "input" && now - q.posted > ANR_MS);
    if (waitingInput && !anrShown) { anrShown = true; addLog("ANR: input dispatch timed out (>5000 ms)"); }
    render();
  }
  function render() {
    clock.textContent = now + " ms";
    if (current) {
      const pct = Math.min(100, ((now - current.start) / current.duration) * 100);
      thread.className = "lp-thread busy" + (current.kind === "heavy" ? " heavy" : "");
      thread.innerHTML = `<b>Running:</b> ${esc(current.label)}<div class="lp-bar"><div style="width:${pct}%"></div></div>`;
    } else {
      thread.className = "lp-thread";
      thread.innerHTML = queue.length ? `<b>Sleeping</b> until next message is due (t=${queue[0].when} ms)` : `<b>Idle</b> — queue empty: IdleHandlers run, thread sleeps in epoll`;
    }
    qEl.innerHTML = queue.length ? queue.map((q) => {
      const due = q.when <= now;
      const waited = now - q.posted;
      return `<div class="lp-item ${q.kind} ${due ? "due" : ""}"><span>${esc(q.label)}</span><small class="mono">${due ? (q.kind === "input" ? `waiting ${waited} ms` : "due") : `in ${q.when - now} ms`}</small></div>`;
    }).join("") : `<div class="muted small">empty</div>`;
    logEl.innerHTML = log.join("");
    logEl.scrollTop = logEl.scrollHeight;
    anrEl.hidden = !anrShown;
  }
  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const a = b.dataset.a;
    if (a === "post") enqueue(`Runnable #${seq + 1}`, now, 300, "msg");
    if (a === "delay") enqueue(`Delayed #${seq + 1}`, now + 1500, 300, "msg");
    if (a === "front") enqueue(`Urgent #${seq + 1}`, now, 300, "msg", true);
    if (a === "input") enqueue(`Touch event #${seq + 1}`, now, 200, "input");
    if (a === "heavy") enqueue(`Heavy work #${seq + 1} (blocking I/O)`, now, 6000, "heavy");
    if (a === "reset") { now = 0; seq = 0; queue = []; current = null; log = []; anrShown = false; }
    render();
  });
  render();
  setInterval(tick, TICK_REAL);
})();
