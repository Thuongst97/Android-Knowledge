(function () {
  "use strict";
  const { $, $$, SequenceDiagram } = window.AAOS;

  /* ----------------------------- Garage Mode sequence ----------------------------- */
  const lanes = [
    { title: "Driver / Vehicle", sub: "Ignition · door lock" },
    { title: "MCU + VHAL", sub: "AP_POWER_STATE_*" },
    { title: "CPMS", sub: "CarPowerManagementService" },
    { title: "GarageMode", sub: "GarageModeController" },
    { title: "JobScheduler", sub: "apps' idle jobs" },
    { title: "Linux Kernel", sub: "/sys/power/state" },
  ];
  const steps = [
    { from: 0, to: 1, kind: "hw", svg: "IGN OFF", label: "Ignition off, doors locked", title: "Driver switches off and leaves", detail: "<p>The MCU detects ignition OFF (over CAN from the BCM). It decides it is time to ask Android to prepare for shutdown, and picks the shutdown type based on OEM configuration, battery voltage and whether an OTA is pending.</p>", tags: [["MCU", "purple"]] },
    { from: 1, to: 2, kind: "ipc", svg: "REQ=SHUTDOWN_PREPARE", label: "REQ = SHUTDOWN_PREPARE (CAN_SLEEP)", title: "VHAL sends the shutdown-prepare request", detail: "<p>The VHAL emits an <code>AP_POWER_STATE_REQ</code> property event with <code>int32Values = [SHUTDOWN_PREPARE, CAN_SLEEP]</code>. CarService receives it via <code>IVehicleCallback.onPropertyEvent</code> and <code>PowerHalService</code> hands it to CPMS.</p>", code: "// int32Values[0] = VehicleApPowerStateReq.SHUTDOWN_PREPARE (1)\n// int32Values[1] = VehicleApPowerStateShutdownParam.CAN_SLEEP (2)\nAP_POWER_STATE_REQ = { 1, 2 }", codeLang: "cpp", tags: [["Binder IPC", "purple"], ["Vehicle Property", ""]] },
    { from: 2, to: 2, svg: "ON → SHUTDOWN_PREPARE", label: "ON → PRE_SHUTDOWN_PREPARE → SHUTDOWN_PREPARE", title: "CPMS changes state", detail: "<p>CPMS notifies listeners of <code>PRE_SHUTDOWN_PREPARE</code> (optionally waiting for completion) and applies the <code>system_power_policy_no_user_interaction</code> policy: display, audio and input off. It then moves to <code>SHUTDOWN_PREPARE</code>.</p>", tags: [["CarService", ""]] },
    { from: 2, to: 1, kind: "ret", svg: "REPORT=SHUTDOWN_PREPARE", label: "REPORT = SHUTDOWN_PREPARE", title: "Tell the MCU: request received", detail: "<p>CPMS writes <code>AP_POWER_STATE_REPORT = SHUTDOWN_PREPARE</code>. The MCU knows Android is preparing and starts its maximum-wait timer.</p>", tags: [["Binder IPC", "purple"]] },
    { from: 2, to: 3, svg: "startGarageMode()", label: "startGarageMode()", title: "Garage Mode begins", detail: "<p>Because the parameter is not <code>SLEEP_IMMEDIATELY</code>, CPMS enters Garage Mode. The device is now considered “idle”.</p>", tags: [["CarService", ""]] },
    { from: 3, to: 4, svg: "idle → run jobs", label: "idle = true → run jobs", title: "JobScheduler runs idle jobs", detail: "<p>Jobs scheduled with <code>setRequiresDeviceIdle(true)</code> start running: OTA package download, offline map updates, background dexopt, user data sync.</p>", tags: [["JobScheduler", "green"]] },
    { from: 2, to: 1, kind: "ret", svg: "REPORT=SHUTDOWN_POSTPONE", label: "REPORT = SHUTDOWN_POSTPONE (repeated)", title: "Asking for more time", detail: "<p>While Garage Mode runs, CPMS periodically sends <code>SHUTDOWN_POSTPONE</code> with an estimated duration. The MCU extends its deadline instead of cutting power. If Android hangs and stops sending, the MCU cuts power when the deadline expires — a battery safety net.</p>", tags: [["Heartbeat", "amber"]] },
    { from: 4, to: 3, kind: "ret", svg: "jobs done", label: "All jobs done / time limit", title: "Jobs complete", detail: "<p>Garage Mode ends when no idle jobs remain or the maximum duration (OEM-configured) is reached. Unfinished jobs are stopped and rescheduled for next time.</p>", tags: [["JobScheduler", "green"]] },
    { from: 3, to: 2, kind: "ret", svg: "finished", label: "Garage Mode finished", title: "Report back to CPMS", detail: "<p>GarageMode signals completion; CPMS proceeds with the next shutdown step according to the <code>CAN_SLEEP</code> parameter.</p>" },
    { from: 2, to: 1, kind: "ret", svg: "REPORT=DEEP_SLEEP_ENTRY", label: "REPORT = DEEP_SLEEP_ENTRY", title: "Announce deep sleep", detail: "<p>CPMS reports <code>DEEP_SLEEP_ENTRY</code>; its state becomes <code>SUSPEND_ENTER</code>. Listeners receive <code>SUSPEND_ENTER</code> to close connections and flush data.</p>", tags: [["Binder IPC", "purple"]] },
    { from: 1, to: 2, kind: "ipc", svg: "REQ=FINISHED", label: "REQ = FINISHED", title: "MCU confirms", detail: "<p>The MCU is ready and responds with <code>AP_POWER_STATE_REQ = FINISHED</code> so Android performs the final step. (The exact ordering of <code>DEEP_SLEEP_ENTRY</code> and <code>FINISHED</code> depends on each OEM's MCU protocol.)</p>" },
    { from: 2, to: 5, kind: "call", svg: "mem → /sys/power/state", label: "write \"mem\" → /sys/power/state", title: "Kernel suspend", detail: "<p>CPMS (through a native helper) asks the kernel to suspend to RAM. Drivers suspend their devices in turn and the CPUs enter sleep.</p>", code: "echo mem > /sys/power/state", codeLang: "conf", tags: [["Kernel", "amber"]] },
    { from: 1, to: 1, kind: "hw", svg: "cut SoC power", label: "Cut SoC power, keep DRAM", title: "MCU cuts power", detail: "<p>The MCU cuts every SoC power rail except DRAM self-refresh. The car is asleep, drawing a few mA. On the next unlock the MCU wakes the SoC → <code>SUSPEND_EXIT</code> → <code>WAIT_FOR_VHAL</code> → <code>ON</code>.</p>", tags: [["MCU", "purple"]] },
  ];
  SequenceDiagram($("#garage-seq"), { lanes, steps, ariaLabel: "Garage Mode sequence", laneW: 168, intro: "Simulates everything from the driver switching off to the SoC entering Suspend-to-RAM. Press <b>Next ▶</b> or <kbd>→</kbd>." });
})();
