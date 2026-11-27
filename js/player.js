/* ==========================================================================
   MODULE: audio player
   Markup: [data-player] (see index.html). Styles: css/player.css.
   Config on the root element:
     data-src       audio file (if it fails to load, a simulated timeline runs)
     data-duration  fallback duration in seconds
   Waveform heights: window.HR_PLAYER_BARS (array of px heights, 135 bars, 4px pitch).
   Public events on the root: "player:play", "player:pause", "player:seek", "player:ended".
   Keyboard on the waveform: Left/Right = 5 s, Home/End, Space/Enter = toggle.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.querySelector("[data-player]");
  if (!root) return;

  var btn = root.querySelector("[data-player-toggle]");
  var wave = root.querySelector("[data-player-wave]");
  var head = root.querySelector("[data-player-playhead]");
  var curEl = root.querySelector("[data-player-current]");
  var totEl = root.querySelector("[data-player-total]");
  var heights = window.HR_PLAYER_BARS || [];
  var H = 48; // bars and playhead are placed in % so the waveform can shrink on small screens

  var duration = parseFloat(root.dataset.duration) || 60;
  var time = 0, playing = false, usingAudio = false, lastTick = 0, raf = 0;
  var audio = new Audio();
  audio.preload = "metadata";

  /* --- build bars --- */
  var bars = heights.map(function (h, i) {
    var b = document.createElement("span");
    b.className = "player__bar";
    // centre of bar i, as % of the waveform (Figma: 2px bars on a 4px pitch across 538px)
    b.style.cssText = "left:" + ((i * 4 + 1) / 538 * 100) + "%;height:" + h + "px;top:" + (H - h) / 2 + "px;--i:" + i;
    wave.insertBefore(b, head);
    return b;
  });

  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function render() {
    var p = duration ? time / duration : 0;
    head.style.left = (Math.min(p, 1) * 100) + "%";
    var played = Math.floor(Math.min(p, 1) * bars.length - 0.0001);
    for (var i = 0; i < bars.length; i++) bars[i].classList.toggle("is-played", i <= played && p > 0);
    curEl.textContent = fmt(time);
    totEl.textContent = fmt(duration);
    wave.setAttribute("aria-valuenow", Math.round(time));
    wave.setAttribute("aria-valuemax", Math.round(duration));
    wave.setAttribute("aria-valuetext", fmt(time) + " of " + fmt(duration));
  }

  function emit(name) { root.dispatchEvent(new CustomEvent("player:" + name, { bubbles: true, detail: { time: time, duration: duration } })); }

  function setPlaying(v) {
    playing = v;
    root.classList.toggle("is-playing", v);
    btn.setAttribute("aria-label", v ? "Pause sample" : "Play sample");
  }

  /* --- timeline (drives the UI; audio.currentTime is the source of truth when available) --- */
  function tick(now) {
    if (!playing) return;
    if (usingAudio) { time = audio.currentTime; }
    else { time += (now - lastTick) / 1000; lastTick = now; }
    if (time >= duration) { time = duration; render(); return end(); }
    render();
    raf = requestAnimationFrame(tick);
  }
  function end() { setPlaying(false); cancelAnimationFrame(raf); emit("ended"); time = 0; if (usingAudio) audio.currentTime = 0; render(); }

  function play() {
    if (playing) return;
    var go = function () { setPlaying(true); lastTick = performance.now(); raf = requestAnimationFrame(tick); emit("play"); };
    if (root.dataset.src && !audio.dataset.failed) {
      audio.play().then(function () { usingAudio = true; go(); }).catch(function () { usingAudio = false; go(); });
    } else { usingAudio = false; go(); }
  }
  function pause() {
    if (!playing) return;
    setPlaying(false); cancelAnimationFrame(raf);
    if (usingAudio) audio.pause();
    emit("pause");
  }
  function seek(sec) {
    time = Math.max(0, Math.min(duration, sec));
    if (usingAudio) audio.currentTime = time;
    render(); emit("seek");
  }

  /* --- audio source --- */
  if (root.dataset.src) {
    audio.src = root.dataset.src;
    audio.addEventListener("loadedmetadata", function () { if (isFinite(audio.duration) && audio.duration > 0) { duration = audio.duration; usingAudio = true; render(); } });
    audio.addEventListener("error", function () { audio.dataset.failed = "1"; usingAudio = false; });
  }

  /* --- interaction --- */
  btn.addEventListener("click", function () { playing ? pause() : play(); });

  function seekFromPointer(e) {
    var r = wave.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * duration);
  }
  var dragging = false;
  wave.addEventListener("pointerdown", function (e) { dragging = true; wave.setPointerCapture(e.pointerId); seekFromPointer(e); });
  wave.addEventListener("pointermove", function (e) { if (dragging) seekFromPointer(e); });
  wave.addEventListener("pointerup", function () { dragging = false; });
  wave.addEventListener("pointercancel", function () { dragging = false; });
  wave.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "ArrowRight") { seek(time + 5); }
    else if (k === "ArrowLeft") { seek(time - 5); }
    else if (k === "Home") { seek(0); }
    else if (k === "End") { seek(duration - 0.01); }
    else if (k === " " || k === "Enter") { playing ? pause() : play(); }
    else return;
    e.preventDefault();
  });

  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });

  render();
  window.HRPlayer = { play: play, pause: pause, seek: seek };
})();
