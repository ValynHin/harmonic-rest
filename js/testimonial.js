/* ==========================================================================
   MODULE: testimonial carousel
   Markup: [data-testimonial] with .testimonial__slide children and
   [data-prev] / [data-next] buttons. With one slide the buttons are disabled.
   Add slides in HTML; this script handles the rest (arrow keys too).
   ========================================================================== */
(function () {
  "use strict";
  document.querySelectorAll("[data-testimonial]").forEach(function (root) {
    var slides = [].slice.call(root.querySelectorAll(".testimonial__slide"));
    var prev = root.querySelector("[data-prev]"), next = root.querySelector("[data-next]");
    var i = Math.max(0, slides.findIndex(function (s) { return s.classList.contains("is-active"); }));

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === i);
        s.setAttribute("aria-label", (k + 1) + " of " + slides.length);
      });
    }
    var single = slides.length < 2;
    prev.disabled = next.disabled = single;
    prev.addEventListener("click", function () { show(i - 1); });
    next.addEventListener("click", function () { show(i + 1); });
    root.addEventListener("keydown", function (e) {
      if (single) return;
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
    show(i);
  });
})();
