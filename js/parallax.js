/* ==========================================================================
   MODULE: scroll parallax
   Markup: any element with [data-parallax] and optional data-parallax-speed
   (default 0.15) and data-parallax-max in px (default 40). Scrolling down moves the element UP: translateY = offset * speed (clamped to ±max),
   where offset = how far the element's centre is below the viewport centre.
   Mode data-parallax="scroll" (hero background): translateY = scrollY * speed,
   clamped to 0..max, so the layer starts flush and drifts down slower than the
   page. Only while the element is absolutely positioned (desktop hero); in the
   stacked tablet/mobile hero it stays put.
   Works with rAF, only while the element is near the viewport. Disabled for
   prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var items = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
    return { el: el, mode: el.dataset.parallax, speed: parseFloat(el.dataset.parallaxSpeed) || 0.15, max: parseFloat(el.dataset.parallaxMax) || 40, on: true, base: 0 };
  });
  if (!items.length) return;
  var ticking = false;

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    items.forEach(function (it) {
      if (!it.on) return;
      if (it.mode === "scroll") {
        var abs = getComputedStyle(it.el).position === "absolute";
        var ys = abs ? Math.min(it.max, Math.max(0, window.scrollY * it.speed)) : 0;
        it.el.style.transform = ys ? "translate3d(0," + ys.toFixed(2) + "px,0)" : "";
        return;
      }
      // measure the untransformed position: current rect minus the transform we applied
      var r = it.el.getBoundingClientRect();
      var centre = r.top - it.base + r.height / 2;
      var delta = centre - vh / 2;               // >0 when element is below the centre
      // scroll down -> delta shrinks -> y shrinks -> picture drifts up faster than the page
      var y = Math.max(-it.max, Math.min(it.max, delta * it.speed));
      it.base = y;
      it.el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
    });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { items.forEach(function (it) { if (it.el === e.target) it.on = e.isIntersecting; }); });
      request();
    }, { rootMargin: "200px 0px" });
    items.forEach(function (it) { io.observe(it.el); });
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
})();
