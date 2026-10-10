(function () {
  "use strict";
  const { $, $$ } = window.AAOS;
  const out = $("#perm-out");
  const ids = ["p-speed", "p-speed-g", "p-climate", "p-allow"];

  function evaluate() {
    const type = $("input[name=apptype]:checked").value;
    const has = (id) => $("#" + id).checked;
    const res = [];

    // dangerous: declared + runtime-granted
    if (!has("p-speed")) res.push(["deny", "registerCallback(PERF_VEHICLE_SPEED)", "SecurityException: android.car.permission.CAR_SPEED is not declared"]);
    else if (!has("p-speed-g")) res.push(["deny", "registerCallback(PERF_VEHICLE_SPEED)", "SecurityException: CAR_SPEED is dangerous → the user must grant it at runtime (requestPermissions)"]);
    else res.push(["ok", "registerCallback(PERF_VEHICLE_SPEED)", "Allowed — speed events delivered"]);

    // signature|privileged
    const label = "setFloatProperty(HVAC_TEMPERATURE_SET, 24f)";
    if (!has("p-climate")) res.push(["deny", label, "SecurityException: CONTROL_CAR_CLIMATE is not declared"]);
    else if (type === "3p") res.push(["deny", label, "Not granted: signature|privileged — a third-party app can never obtain this permission"]);
    else if (type === "priv" && !has("p-allow")) res.push(["deny", label, "Not granted: privileged app without a privapp-permissions allowlist entry (the device may fail to boot when enforced)"]);
    else res.push(["ok", label, type === "plat" ? "Allowed — same platform signature" : "Allowed — privileged + allowlisted"]);

    // INFO_VIN (never declared in this demo)
    res.push(["deny", "getProperty(INFO_VIN)", "SecurityException: requires CAR_IDENTIFICATION (signature|privileged) — not declared"]);

    out.innerHTML = res.map((r) => `<div class="${r[0]}">${r[0] === "ok" ? "✔" : "✖"} <b>${r[1]}</b><br><span style="color:var(--text-2)">${r[2]}</span></div>`).join("") +
      `<p class="small muted" style="font-family:var(--font)">The check happens inside <code>CarPropertyService</code> using the Binder caller's UID — apps cannot spoof it.</p>`;
    $("#p-allow").closest("label").style.opacity = type === "priv" ? 1 : 0.45;
  }
  $$("input[name=apptype]").forEach((r) => r.addEventListener("change", evaluate));
  ids.forEach((id) => $("#" + id).addEventListener("change", evaluate));
  evaluate();
})();
