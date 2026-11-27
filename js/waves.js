/* ==========================================================================
   MODULE: waves (echo lines + travelling green glint), single <canvas>, 24 s loop
   Needs: js/waves-data.js (window.HR_WAVES, generated from the Figma motion data)
   Markup: <canvas data-waves width="1440" height="788"></canvas>
   - Full-bleed: wider than 1440 the Figma artwork is stretched horizontally
     (x * sx); narrower than 1440 it keeps its 1440 size and stays centred
     (Website DS rule for graphics on mobile). Heights and strokes never change.
   - Pauses when off-screen or tab hidden.
   - prefers-reduced-motion: draws one static frame.
   Tracks are flat [percent, value, easing, ...]; easing 0 linear, 1 ease-in-out,
   2 ease-out, 3 ease-in (applies to the segment starting at that key).
   ========================================================================== */
(function () {
  "use strict";
  var D = window.HR_WAVES;
  var canvas = document.querySelector("[data-waves]");
  if (!D || !canvas) return;

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = D.W, sx = 1, ox = 0; // canvas CSS width, horizontal scale, horizontal offset

  /* --- easing / track evaluation --- */
  var EASE = [
    function (t) { return t; },
    function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }, // ease-in-out
    function (t) { return 1 - (1 - t) * (1 - t); },                                   // ease-out
    function (t) { return t * t; }                                                    // ease-in
  ];
  function track(tr, pct) {
    var n = tr.length;
    if (pct <= tr[0]) return tr[1];
    for (var i = 0; i < n - 3; i += 3) {
      var p0 = tr[i], p1 = tr[i + 3];
      if (pct >= p0 && pct <= p1) {
        var k = p1 === p0 ? 1 : (pct - p0) / (p1 - p0);
        return tr[i + 1] + (tr[i + 4] - tr[i + 1]) * EASE[tr[i + 2]](k);
      }
    }
    return tr[n - 2];
  }

  /* --- geometry --- */
  var N = D.lines[0].ys.length;
  // curve y in canvas coords = vy + ys[i] + frameTop (verified against the Figma render)
  function figmaY(l, i) { return l.vy + l.ys[i] + D.frameTop; }

  // Strand curves are exactly Figma's (fan / untwist experiments were rejected).
  D.lines.forEach(function (l) {
    l.fy = new Array(N);
    for (var i = 0; i < N; i++) l.fy[i] = figmaY(l, i);
  });
  function lineY(l, i) { return l.fy[i]; }
  D.lines.forEach(function (l) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < N; i++) { var y = lineY(l, i); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    l.pivot = (lo + hi) / 2;
  });

  function hGradient(stops, rgb, alphaScale) {
    var g = ctx.createLinearGradient(ox + D.xStart * sx, 0, ox + (D.xStart + (N - 1) * D.xStep) * sx, 0);
    stops.forEach(function (s) { g.addColorStop(s[0], "rgba(" + rgb + "," + (s[1] * alphaScale) + ")"); });
    return g;
  }
  function hex2rgb(h) {
    h = h.replace("#", "");
    return parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16);
  }
  var lineRGB = hex2rgb(D.lineColor), glintRGB = hex2rgb(D.glintColor);
  // Brightness knobs (1 = exact Figma values). Raised on request: the Figma look read too faint on screen.
  var LINE_BOOST = 1.7, GLINT_BOOST = 1.45;
  // Playback speed (1 = Figma's 24 s loop). 1.3 = about 18.5 s per loop.
  var SPEED = 1.3;
  var lineStroke, glintStroke;

  function strokeLine(l, sy, tx) {
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var x = ox + (D.xStart + i * D.xStep + tx) * sx;
      var y = l.pivot + (lineY(l, i) - l.pivot) * sy;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /* --- glint mask: horizontal alpha gradient that travels across the glint lines --- */
  var glintLayer = document.createElement("canvas");
  var gctx = glintLayer.getContext("2d");

  function resize() {
    // match the visible page width (100vw would also include the scrollbar and
    // hide the right-hand fade under it)
    canvas.parentElement.style.width = document.documentElement.clientWidth + "px";
    W = canvas.clientWidth || D.W;
    sx = Math.max(1, W / D.W);
    ox = (W - D.W * sx) / 2;
    canvas.width = glintLayer.width = Math.round(W * dpr);
    canvas.height = glintLayer.height = Math.round(D.H * dpr);
    lineStroke = hGradient(D.lineGradient, lineRGB, LINE_BOOST);
    glintStroke = hGradient(D.glintGradient, glintRGB, GLINT_BOOST);
  }
  resize();

  function drawGlint(pct, progress) {
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.clearRect(0, 0, W, D.H);
    var c = ctx; ctx = gctx; // reuse stroke helper on the offscreen layer
    ctx.lineWidth = D.glintWidth;
    ctx.strokeStyle = glintStroke;
    D.lines.forEach(function (l) { strokeLine(l, track(l.gsy, pct), track(l.gtx, pct)); });
    // mask: destination-in with moving gradient
    // Figma: Glint mask translateX 0 -> 960px, linear, 24 s loop. The mask has three
    // bumps 960px apart, so the jump back to 0 at the loop point is seamless.
    var shift = D.maskTravel * progress;
    var x0 = D.maskX + shift;
    var g = ctx.createLinearGradient(ox + x0 * sx, 0, ox + (x0 + D.maskWidth) * sx, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    D.maskStops.forEach(function (s) { g.addColorStop(s[0], "rgba(0,0,0," + s[1] + ")"); });
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, D.H);
    ctx.globalCompositeOperation = "source-over";
    ctx = c;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = track(D.glintOpacity, pct);
    ctx.drawImage(glintLayer, 0, 0);
    ctx.restore();
  }

  function draw(ms) {
    var progress = ((ms * SPEED) % D.durationMs) / D.durationMs, pct = progress * 100;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, D.H);

    // echo lines
    ctx.save();
    ctx.globalAlpha = D.echoOpacity;
    ctx.lineWidth = D.lineWidth; ctx.strokeStyle = lineStroke; ctx.lineJoin = "round";
    D.lines.forEach(function (l) { strokeLine(l, track(l.sy, pct), track(l.tx, pct)); });
    ctx.restore();

    // glint lines
    drawGlint(pct, progress);

    ctx.globalAlpha = 1;
  }

  /* --- run loop --- */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var visible = true, raf = 0, t0 = 0, offset = 0;
  function frame(now) {
    if (!t0) t0 = now - offset;
    offset = now - t0;
    draw(offset);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && !reduce) { t0 = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  var resizeRaf = 0;
  window.addEventListener("resize", function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      if (document.documentElement.clientWidth === W) return;
      resize();
      draw(reduce ? D.durationMs * 0.4 : offset);
    });
  });

  if (reduce) { draw(D.durationMs * 0.4); return; }
  draw(0);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(canvas);
  } else start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : (visible && start()); });
  window.HR_WAVES_DEBUG = { draw: draw };
})();
