(function () {
  "use strict";
  const { $, $$, esc } = window.AAOS;

  const ZONES = [
    { id: 0, type: "OCCUPANT_TYPE_DRIVER", seat: "SEAT_ROW_1_LEFT", user: "Driver — current user (e.g. 10)", audio: 0, displays: ["ivi", "cluster", "hud"], color: "#70cff8", note: "The driver's zone owns the MAIN display, the cluster and the HUD. UX Restrictions apply to this zone's MAIN display while the car is moving." },
    { id: 1, type: "OCCUPANT_TYPE_FRONT_PASSENGER", seat: "SEAT_ROW_1_RIGHT", user: "Visible background user (11)", audio: 1, displays: ["pax"], color: "#34d399", note: "The passenger screen is usually allowed to play video while driving, provided the viewing angle does not face the driver (market-specific regulation)." },
    { id: 2, type: "OCCUPANT_TYPE_REAR_PASSENGER", seat: "SEAT_ROW_2_LEFT", user: "Visible background user (12)", audio: 2, displays: ["rsel"], color: "#fbbf24", note: "Screen mounted on the back of the driver's seat; its touch input only goes to this display." },
    { id: 3, type: "OCCUPANT_TYPE_REAR_PASSENGER", seat: "SEAT_ROW_2_RIGHT", user: "Visible background user (13)", audio: 3, displays: ["rser"], color: "#a78bfa", note: "Same as zone 2, with its own headphone audio zone." },
  ];
  const DISPLAYS = {
    ivi: { name: "Center Display (IVI)", type: "DISPLAY_TYPE_MAIN", port: 0, zone: 0, input: "TOUCH_SCREEN | ROTARY_NAVIGATION | DPAD_KEYS | NAVIGATE_KEYS" },
    cluster: { name: "Instrument Cluster", type: "DISPLAY_TYPE_INSTRUMENT_CLUSTER", port: 1, zone: 0, input: "DPAD_KEYS (steering-wheel keys)" },
    hud: { name: "Head-Up Display", type: "DISPLAY_TYPE_HUD", port: 5, zone: 0, input: "— (display only)" },
    pax: { name: "Passenger Display", type: "DISPLAY_TYPE_MAIN", port: 2, zone: 1, input: "TOUCH_SCREEN" },
    rsel: { name: "Left RSE", type: "DISPLAY_TYPE_MAIN", port: 3, zone: 2, input: "TOUCH_SCREEN" },
    rser: { name: "Right RSE", type: "DISPLAY_TYPE_MAIN", port: 4, zone: 3, input: "TOUCH_SCREEN" },
  };
  const info = $("#oz-info");

  let cabin = null;
  function highlight(zoneId, displayKey) {
    if (cabin) cabin.select(zoneId, displayKey);
  }
  function showZone(i) {
    const z = ZONES[i];
    highlight(i);
    info.style.borderTop = `3px solid ${z.color}`;
    info.innerHTML = `<div class="small" style="color:${z.color};font-weight:700;text-transform:uppercase;letter-spacing:.1em">OccupantZoneInfo</div>
      <h4 style="margin-top:4px">occupantZoneId = ${z.id}</h4>
      <dl class="kv">
        <dt>occupantType</dt><dd><code>${z.type}</code></dd>
        <dt>seat</dt><dd><code>VehicleAreaSeat.${z.seat}</code></dd>
        <dt>Android user</dt><dd>${z.user}</dd>
        <dt>audioZoneId</dt><dd><code>${z.audio}</code> — see <a href="audio.html#zones">Multi-Zone Audio</a></dd>
        <dt>Displays</dt><dd>${z.displays.map((d) => `<button class="chip" data-show="${d}" style="cursor:pointer">${esc(DISPLAYS[d].name)}</button>`).join(" ")}</dd>
      </dl>
      <p class="small muted">${z.note}</p>`;
    $$("[data-show]", info).forEach((b) => b.addEventListener("click", () => showDisplay(b.dataset.show)));
  }
  function showDisplay(k) {
    const d = DISPLAYS[k], z = ZONES[d.zone];
    highlight(d.zone, k);
    info.style.borderTop = `3px solid ${z.color}`;
    info.innerHTML = `<div class="small" style="color:${z.color};font-weight:700;text-transform:uppercase;letter-spacing:.1em">Display</div>
      <h4 style="margin-top:4px">${esc(d.name)}</h4>
      <dl class="kv">
        <dt>displayType</dt><dd><code>${d.type}</code></dd>
        <dt>displayPort</dt><dd><code>${d.port}</code></dd>
        <dt>inputTypes</dt><dd><code>${d.input}</code></dd>
        <dt>Owning zone</dt><dd><button class="chip" data-zone="${d.zone}" style="cursor:pointer">occupantZoneId = ${d.zone}</button></dd>
      </dl>
      <p class="small"><code>ozm.getDisplayForOccupant(zone${d.zone}, CarOccupantZoneManager.${d.type})</code></p>`;
    $("[data-zone]", info).addEventListener("click", () => showZone(d.zone));
  }
  cabin = window.AAOS.Cabin($("#disp-cabin"), { mode: "display", onZone: showZone, onDisplay: showDisplay });
  showZone(0);
})();
