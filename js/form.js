/* ==========================================================================
   MODULE: signup form (works for every [data-signup] on the page)
   Validation: first name and email are required.
   DEMO = true accepts any non-empty email (handy for showing the flow).
   Set DEMO = false before launch to require a valid email format.
   States: error (field.is-error), success (card.is-success + thank-you panel
   cloned from <template id="signup-thanks">).
   Developer hook: listen for the "signup:submit" event on the card, e.g.
     card.addEventListener("signup:submit", e => { e.detail = {firstName,email,marketingOptIn} ... });
   Call e.preventDefault() in your handler to take over (send to your API / HubSpot),
   then call window.HRSignup.showThanks(card) yourself.
   Share links use data-share-url on <body> if set, otherwise the current page URL.
   ========================================================================== */
(function () {
  "use strict";
  var DEMO = true;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var tpl = document.getElementById("signup-thanks");

  var SHARE_TEXT = "A free 3-minute sound reset from Harmonic Rest, for moments when you need a little space.";
  function shareUrl() { return document.body.dataset.shareUrl || location.origin + location.pathname; }

  function wireShare(panel) {
    var url = shareUrl();
    var links = {
      whatsapp: "https://wa.me/?text=" + encodeURIComponent(SHARE_TEXT + " " + url),
      email: "mailto:?subject=" + encodeURIComponent("A little pause for you") + "&body=" + encodeURIComponent(SHARE_TEXT + "\n\n" + url),
      facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)
    };
    panel.querySelectorAll("a[data-share]").forEach(function (a) { a.href = links[a.dataset.share]; });

    var copyBtn = panel.querySelector('[data-share="copy"]');
    var note = panel.querySelector(".thanks__copied");
    var timer = 0;
    copyBtn.addEventListener("click", function () {
      var done = function () {
        note.textContent = "Link copied";
        clearTimeout(timer);
        timer = setTimeout(function () { note.textContent = ""; }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
      } else { fallbackCopy(url); done(); }
    });
  }
  function fallbackCopy(text) {
    var t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {}
    t.remove();
  }

  function showThanks(card) {
    if (card.classList.contains("is-success") || !tpl) return;
    var panel = tpl.content.firstElementChild.cloneNode(true);
    // The card shrinks to the message; its section keeps its height so the page doesn't jump
    // (only where the card is centred in a flex section; the stacked mobile hero just shrinks)
    var section = card.parentElement;
    if (section && getComputedStyle(section).display === "flex") section.style.minHeight = section.offsetHeight + "px";
    card.appendChild(panel);
    wireShare(panel);
    card.classList.add("is-success");
    panel.focus({ preventScroll: true });
    var r = card.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.querySelectorAll("[data-signup]").forEach(function (card) {
    var form = card.querySelector("[data-signup-form]");
    if (!form) return;
    var fields = [].slice.call(form.querySelectorAll("[data-field]"));

    function validate(field) {
      var input = field.querySelector("input");
      var v = input.value.trim();
      var ok = input.type === "email" && !DEMO ? EMAIL.test(v) : v.length > 0;
      field.classList.toggle("is-error", !ok);
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      return ok;
    }

    fields.forEach(function (f) {
      var input = f.querySelector("input");
      input.addEventListener("blur", function () { if (input.value) validate(f); });
      input.addEventListener("input", function () { if (f.classList.contains("is-error")) validate(f); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var results = fields.map(validate);
      if (results.indexOf(false) !== -1) {
        fields[results.indexOf(false)].querySelector("input").focus();
        return;
      }
      var data = {
        firstName: form.elements.firstName.value.trim(),
        email: form.elements.email.value.trim(),
        marketingOptIn: form.elements.marketingOptIn.checked
      };
      var ev = new CustomEvent("signup:submit", { bubbles: true, cancelable: true, detail: data });
      if (card.dispatchEvent(ev)) showThanks(card);
    });
  });

  window.HRSignup = { showThanks: showThanks };
})();
