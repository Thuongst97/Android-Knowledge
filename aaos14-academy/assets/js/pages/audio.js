(function () {
  "use strict";
  const { $, $$, esc } = window.AAOS;

  /* ------------------------------ Zones ------------------------------ */
  const ZONES = [
    {
      name: "Primary zone (Driver)", color: "var(--zone-0)", occupant: "Occupant zone 0 · DRIVER · SEAT_ROW_1_LEFT", user: "Driver user (e.g. user 10)",
      display: "Center Display (MAIN) + Cluster",
      groups: [["Media", "bus0_media_out", "MUSIC, ANNOUNCEMENT", 60], ["Navigation", "bus1_navigation_out · bus2_voice_command_out", "NAVIGATION, VOICE_COMMAND", 70], ["Call", "bus4_call_out", "CALL_RING, CALL", 65], ["System", "bus5_alarm_out", "ALARM, NOTIFICATION, SYSTEM_SOUND, EMERGENCY, SAFETY, VEHICLE_STATUS", 55]],
      note: "The primary zone always exists (audioZoneId = 0). Safety sounds (SAFETY, EMERGENCY) and warning chimes are typically required to play in this zone.",
    },
    {
      name: "Zone 1 (Front passenger)", color: "var(--zone-1)", occupant: "Occupant zone 1 · FRONT_PASSENGER · SEAT_ROW_1_RIGHT", user: "Passenger user (user 11)",
      display: "Passenger Display (MAIN of zone 1)",
      groups: [["All", "bus100_audio_zone_1", "All contexts", 45]],
      note: "Usually headrest speakers or the front passenger's Bluetooth headphones.",
    },
    {
      name: "Zone 2 (Rear-left)", color: "var(--zone-2)", occupant: "Occupant zone 2 · REAR_PASSENGER · SEAT_ROW_2_LEFT", user: "Rear user (user 12)",
      display: "Left RSE",
      groups: [["All", "bus200_audio_zone_2", "All contexts", 50]],
      note: "Headphones attached to the rear-left entertainment screen. Independent focus stack: the movie is not interrupted when the driver takes a call.",
    },
    {
      name: "Zone 3 (Rear-right)", color: "var(--zone-3)", occupant: "Occupant zone 3 · REAR_PASSENGER · SEAT_ROW_2_RIGHT", user: "Rear user (user 13)",
      display: "Right RSE",
      groups: [["All", "bus300_audio_zone_3", "All contexts", 40]],
      note: "Same as zone 2. In Android 14 a zone may have several zoneConfigs (e.g. switching between a 3.5 mm jack and Bluetooth).",
    },
  ];
  const info = $("#zone-info");
  const volumes = ZONES.map((z) => z.groups.map((g) => g[3]));
  function showZone(i) {
    const z = ZONES[i];
    cabin.select(i);
    info.style.borderTop = `3px solid ${z.color}`;
    info.innerHTML = `<div style="color:${z.color};font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;font-weight:700">audioZoneId = ${i}</div>
      <h4 style="margin-top:4px">${esc(z.name)}</h4>
      <dl class="kv"><dt>Occupant</dt><dd><code>${z.occupant}</code></dd><dt>Android user</dt><dd>${z.user}</dd><dt>Display</dt><dd>${z.display}</dd></dl>
      <h4>Volume groups</h4>
      ${z.groups.map((g, gi) => `<div class="vol-group"><label><span><b>${g[0]}</b> <small>${g[1]}</small></span><span class="mono" data-vv="${gi}">${volumes[i][gi]}</span></label>
        <input type="range" min="0" max="100" value="${volumes[i][gi]}" data-g="${gi}" aria-label="${g[0]} volume"><small>${g[2]}</small></div>`).join("")}
      <p class="small muted" style="margin-top:12px">${z.note}</p>
      <p class="small"><code>carAudioManager.setGroupVolume(${i} /*zoneId*/, groupId, index, 0)</code></p>`;
    $$("input[type=range]", info).forEach((r) => r.addEventListener("input", () => {
      volumes[i][+r.dataset.g] = +r.value;
      $(`[data-vv="${r.dataset.g}"]`, info).textContent = r.value;
    }));
  }
  const cabin = window.AAOS.Cabin($("#audio-cabin"), { mode: "audio", onZone: showZone });
  showZone(0);

  /* ------------------------------ Focus ------------------------------ */
  const CTX = ["MUSIC", "NAVIGATION", "VOICE_COMMAND", "CALL", "ALARM", "EMERGENCY"];
  // M[holder][requester]
  const M = {
    MUSIC:         { MUSIC: "E", NAVIGATION: "C", VOICE_COMMAND: "E", CALL: "E", ALARM: "E", EMERGENCY: "E" },
    NAVIGATION:    { MUSIC: "C", NAVIGATION: "E", VOICE_COMMAND: "E", CALL: "E", ALARM: "C", EMERGENCY: "E" },
    VOICE_COMMAND: { MUSIC: "R", NAVIGATION: "R", VOICE_COMMAND: "C", CALL: "E", ALARM: "R", EMERGENCY: "E" },
    CALL:          { MUSIC: "R", NAVIGATION: "C", VOICE_COMMAND: "R", CALL: "C", ALARM: "C", EMERGENCY: "C" },
    ALARM:         { MUSIC: "C", NAVIGATION: "C", VOICE_COMMAND: "E", CALL: "E", ALARM: "C", EMERGENCY: "E" },
    EMERGENCY:     { MUSIC: "R", NAVIGATION: "R", VOICE_COMMAND: "R", CALL: "C", ALARM: "R", EMERGENCY: "C" },
  };
  const NAME = { E: "EXCLUSIVE", C: "CONCURRENT", R: "REJECT" };
  const LABEL = { MUSIC: "music", NAVIGATION: "the navigation prompt", VOICE_COMMAND: "the voice assistant", CALL: "the phone call", ALARM: "the alarm/alert", EMERGENCY: "the emergency sound" };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fh = $("#fh"), fr = $("#fr"), out = $("#focus-result"), table = $("#fmatrix");
  [fh, fr].forEach((s) => (s.innerHTML = CTX.map((c) => `<option>${c}</option>`).join("")));
  fh.value = "MUSIC"; fr.value = "NAVIGATION";

  table.innerHTML = `<thead><tr><th>Holder \\ Requester</th>${CTX.map((c) => `<th>${c.replace("_", " ")}</th>`).join("")}</tr></thead><tbody>` +
    CTX.map((h) => `<tr><td>${h}</td>${CTX.map((r) => `<td class="cell fx-${M[h][r]}" data-h="${h}" data-r="${r}">${M[h][r]}</td>`).join("")}</tr>`).join("") + `</tbody>`;
  table.addEventListener("click", (e) => { const c = e.target.closest("td.cell"); if (c) { fh.value = c.dataset.h; fr.value = c.dataset.r; run(); } });

  function run() {
    const h = fh.value, r = fr.value, k = M[h][r];
    $$("td.cell", table).forEach((c) => c.classList.toggle("sel", c.dataset.h === h && c.dataset.r === r));
    const text = {
      E: `<b>${cap(LABEL[r])}</b> gets focus. <b>${cap(LABEL[h])}</b> receives <code>AUDIOFOCUS_LOSS_TRANSIENT</code> (or <code>AUDIOFOCUS_LOSS</code>) and should pause; if the loss is transient, focus is returned when ${LABEL[r]} ends.`,
      C: `Both play at the same time. <b>${cap(LABEL[h])}</b> may be <strong>ducked</strong> (attenuated) — with <code>useHalDuckingSignals</code>, CarAudioService tells the DSP which devices to duck via <code>IAudioControl.onDevicesToDuckChange()</code>.`,
      R: `The request from <b>${LABEL[r]}</b> is rejected: <code>requestAudioFocus()</code> returns <code>AUDIOFOCUS_REQUEST_FAILED</code>. The app must respect the result and not play.`,
    }[k];
    const col = { E: "var(--amber)", C: "var(--green)", R: "var(--red)" }[k];
    out.style.borderColor = col;
    out.innerHTML = `<div class="fr-title" style="color:${col}">${NAME[k]}</div><p class="small" style="margin:6px 0 0">${text}</p>
      <p class="small muted" style="margin:8px 0 0">Focus is arbitrated <strong>independently per audio zone</strong> — the same pair of requests in another zone does not interfere.</p>`;
  }
  fh.addEventListener("change", run); fr.addEventListener("change", run);
  run();
})();
