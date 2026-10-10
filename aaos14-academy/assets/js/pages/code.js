(function () {
  "use strict";
  const { $, renderCodeExplorer } = window.AAOS;
  const src = (id) => $("#src-" + id).textContent;

  const SPECS = {
    kotlin: {
      file: "VehicleDataController.kt", lang: "kotlin", label: "Kotlin",
      notes: {
        1: ["The android.car library", "Available on AAOS devices. With Gradle, add <code>useLibrary(\"android.car\")</code> inside the <code>android {}</code> block."],
        2: ["Car.createCar with a listener", "Binds to CarService. The listener variant handles CarService restarts (crash/update) for you — always prefer it over the synchronous <code>createCar(context)</code>."],
        3: ["ready = false", "CarService just died. All previously obtained managers are invalid; the listener fires again with <code>ready = true</code> once CarService is back."],
        4: ["Get CarPropertyManager", "<code>Car.PROPERTY_SERVICE</code> returns the Vehicle Property manager. Likewise <code>Car.AUDIO_SERVICE</code>, <code>Car.POWER_SERVICE</code>…"],
        5: ["CarPropertyEventCallback", "Receives <code>onChangeEvent</code> (new value) and <code>onErrorEvent</code>. Runs on the main thread by default; an Executor variant exists."],
        6: ["Check the status", "A property can be <code>STATUS_UNAVAILABLE</code> (e.g. ECU not ready) or <code>STATUS_ERROR</code>. Never read <code>value</code> unless it is AVAILABLE."],
        7: ["SI units", "<code>PERF_VEHICLE_SPEED</code> is in <strong>m/s</strong> (float). Multiply by 3.6 for km/h. Use <code>VEHICLE_SPEED_DISPLAY_UNITS</code> to pick display units."],
        8: ["registerCallback", "Subscribes to a CONTINUOUS property at a sample rate (Hz). <code>SENSOR_RATE_NORMAL</code> ≈ 1 Hz, <code>SENSOR_RATE_FASTEST</code> = maxSampleRate. Requires <code>CAR_SPEED</code> (dangerous)."],
        9: ["Read CarPropertyConfig", "Returns null if the car doesn't support the property or the app lacks permission. Always check before writing."],
        10: ["Find the right areaId", "Many cars merge HVAC areas (e.g. ROW_1_LEFT | ROW_2_LEFT share one vent). Don't hard-code — pick the areaId that <em>contains</em> the desired seat."],
        11: ["AreaIdConfig (API 34)", "Android 14 adds <code>getAreaIdConfig()</code> with per-area min/max. Clamp before sending to avoid <code>IllegalArgumentException</code>."],
        12: ["isPropertyAvailable", "E.g. when HVAC is off (<code>HVAC_POWER_ON = false</code>) the temperature may not be writable."],
        13: ["setFloatProperty — asynchronous", "Returns immediately; confirmation arrives through <code>onChangeEvent</code>. Requires <code>CONTROL_CAR_CLIMATE</code> (signature|privileged). The value only becomes “true” when the VHAL reports it back from the ECU."],
        14: ["Clean up", "Unregister callbacks and disconnect when the component is destroyed to avoid Binder leaks and pointless events."],
      },
    },
    manifest: {
      file: "AndroidManifest.xml", lang: "xml", label: "XML",
      notes: {
        1: ["Automotive feature", "Marks the app as AAOS-only. Play Store uses this to filter devices."],
        2: ["CAR_SPEED", "<strong>Dangerous</strong> level: declare it here and request it at runtime with <code>requestPermissions()</code>."],
        3: ["CONTROL_CAR_CLIMATE", "<strong>signature|privileged</strong> level: the app must live in <code>/system/priv-app</code> and be listed in a <code>privapp-permissions-*.xml</code> file, or be signed with the platform key."],
        4: ["Car UI theme", "Use the Car UI library (<code>car-ui-lib</code>) so OEMs can restyle the UI through RROs."],
        5: ["Resizeable", "Needed for multi-display/multi-window: the activity may be launched on a passenger display."],
        6: ["distractionOptimized", "Tells <code>CarUxRestrictionsManager</code> the activity is safe while driving. Without it the activity is blocked when the car moves."],
      },
    },
    aidl: {
      file: "IVehicle.aidl · IVehicleCallback.aidl", lang: "aidl", label: "AIDL",
      notes: {
        1: ["@VintfStability", "A stable interface between system and vendor; the API is frozen per version (V1, V2…). Changes require a new, backward-compatible version."],
        2: ["getAllPropConfigs", "Called by CarService at startup to learn which properties the car supports. Large results go through LargeParcelable."],
        3: ["getValues — asynchronous", "Sends a batch of requests; results come back through <code>callback.onGetValues()</code>. No direct return value."],
        4: ["setValues — asynchronous", "Same pattern: results via <code>onSetValues()</code>. OK only means the request was accepted/sent."],
        5: ["subscribe", "Registers for <code>onPropertyEvent</code>. <code>SubscribeOptions</code> holds propId, areaIds and sampleRate (for CONTINUOUS)."],
        6: ["Shared memory", "The client returns the shared memory region after reading a large event batch — avoids copying data through Binder."],
        7: ["oneway", "Non-blocking callbacks: the VHAL doesn't wait for CarService to finish. Ordering from a single client is preserved."],
        8: ["onPropertyEvent", "The single channel for pushing value changes to the framework — whether the change came from the car (driver turned a physical knob) or from a set command."],
        9: ["requestId", "Created by the client, unique; used to match asynchronous results to requests and for timeouts."],
        10: ["sharedMemoryFd", "If the payload is too large, data is written to shared memory and only the file descriptor crosses Binder."],
        11: ["timestamp", "Event time in <code>elapsedRealtimeNano</code> — essential for ordering and discarding stale events."],
        12: ["RawPropValues", "A generic container: FLOAT properties use <code>floatValues[0]</code>; INT32_VEC uses several <code>int32Values</code>; MIXED combines fields."],
      },
    },
    "cpp-h": {
      file: "OemVehicleHardware.h", lang: "cpp", label: "C++",
      notes: {
        1: ["IVehicleHardware.h", "Interface from AOSP (<code>hardware/interfaces/automotive/vehicle/aidl/impl/hardware</code>). The OEM implements only this; <code>DefaultVehicleHal</code> handles AIDL."],
        2: ["CAN mapping table", "Hypothetical values. In practice these are generated from DBC/ARXML to avoid manual mistakes."],
        3: ["final class", "One hardware class per VHAL process. It can delegate internally to several backends (CAN, SOME/IP, MCU IPC)."],
        4: ["getAllPropertyConfigs", "The list of supported properties. DefaultVehicleHal uses it to reject invalid requests early."],
        5: ["Callbacks registered once", "DefaultVehicleHal passes these callbacks at init; the hardware invokes them whenever new values arrive from the bus."],
        6: ["RX thread", "A dedicated thread reads CAN so Binder threads are never blocked. Synchronize access to the cache."],
        7: ["Value cache", "Serves <code>getValues</code> instantly without asking the ECU again. Keyed by (prop, areaId)."],
      },
    },
    cpp: {
      file: "OemVehicleHardware.cpp · VehicleService.cpp", lang: "cpp", label: "C++",
      notes: {
        1: ["SocketCAN", "Opens a raw CAN socket on <code>can0</code>. Many designs use an SPI/Ethernet channel to the MCU instead — that change stays inside this class."],
        2: ["Start the RX thread", "Listen to the bus as soon as the VHAL is created; CarService may subscribe early during boot."],
        3: ["HVAC_TEMPERATURE_SET config", "READ_WRITE, ON_CHANGE, two areas (left/right seat) with 16–28 °C limits."],
        4: ["configArray", "Standard format for this property: <code>[minC×10, maxC×10, stepC×10, minF×10, maxF×10, stepF×10]</code> → 16.0–28.0 °C in 0.5 steps; 60.5–82.5 °F in 1.0 steps."],
        5: ["Speed config", "CONTINUOUS, 1–10 Hz sample rate, GLOBAL area (areaId 0)."],
        6: ["Match the requestId", "Every result must carry its request's requestId — DefaultVehicleHal uses it to answer the right client."],
        7: ["Invoke the callback", "Can be called synchronously (as here) or later from another thread (async) — DefaultVehicleHal supports both and handles timeouts."],
        8: ["Branch per property", "Each writable property has an encode branch. Unsupported properties return <code>NOT_AVAILABLE</code>."],
        9: ["Value encoding", "raw = phys / factor = 24.0 / 0.5 = 48 = 0x30. <code>crc8()</code> is an OEM E2E helper (not part of AOSP)."],
        10: ["Error codes", "<code>TRY_AGAIN</code> for transient errors (full buffer, bus-off). CarService reports <code>onErrorEvent</code> to the app."],
        11: ["Read loop", "<code>read()</code> blocks until a frame arrives. In practice set CAN filters (<code>CAN_RAW_FILTER</code>) to receive only relevant IDs."],
        12: ["Decode the status frame", "Frame 0x3A3 from the ECU → <code>HVAC_TEMPERATURE_SET</code>. This is the “truth” the UI displays."],
        13: ["Push the event up", "DefaultVehicleHal filters by subscription, batches and calls <code>IVehicleCallback.onPropertyEvent</code>."],
        14: ["Assemble the VHAL", "<code>DefaultVehicleHal</code> (AOSP) wraps the OEM hardware and implements <code>IVehicle</code>."],
        15: ["Register the service", "The instance name <code>android.hardware.automotive.vehicle.IVehicle/default</code> must match the VINTF manifest and service_contexts."],
      },
    },
    build: {
      file: "Android.bp · .rc · VINTF · SEPolicy", lang: "conf", label: "Build",
      notes: {
        1: ["Binary name", "Installed in <code>/vendor/bin/hw/</code>. The name follows convention but is not mandatory."],
        2: ["AOSP libraries", "<code>DefaultVehicleHal</code> and <code>VehicleHalUtils</code> provide all the AIDL, subscription and pending-request machinery."],
        3: ["init_rc & vintf_fragments", "The build system installs the .rc file and merges the fragment into the vendor VINTF manifest."],
        4: ["class early_hal", "The VHAL starts early because CarService (and EVS, power management, etc.) depend on it."],
        5: ["Version 2", "Android 14 uses VHAL AIDL V2. The framework compatibility matrix checks this version at boot."],
        6: ["hal_server_domain", "Makes the domain a server of <code>hal_vehicle</code> → allowed to register <code>hal_vehicle_service</code> and receive Binder calls from <code>hal_vehicle_client</code>."],
        7: ["CAN socket permission", "The minimal rule to open and use a raw CAN socket. Add only what you need — never go permissive."],
        8: ["Add it to the image", "Add the module to <code>PRODUCT_PACKAGES</code> and drop the default VHAL (<code>android.hardware.automotive.vehicle@V*-default-service</code>) if present."],
      },
    },
  };

  Object.entries(SPECS).forEach(([id, spec]) => renderCodeExplorer($("#ex-" + id), { ...spec, src: src(id) }));

  // Deep link: code.html#cpp opens the C++ tab
  const tabs = $("#code-tabs");
  const openFromHash = () => {
    const key = location.hash.slice(1);
    if (SPECS[key] && tabs.selectTab) { tabs.selectTab(key); tabs.scrollIntoView({ behavior: "instant", block: "start" }); }
  };
  window.addEventListener("hashchange", openFromHash);
  window.addEventListener("load", openFromHash);
})();
