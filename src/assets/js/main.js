// Two small things: the mobile menu, and submitting the estimate form without
// bouncing the visitor to a third-party thank-you page.
//
// Everything on the site works with this file absent — the nav links are real
// links and the form is a real form that posts. This is enhancement only.

(function () {
  "use strict";

  // --- mobile nav ----------------------------------------------------------

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Close it on outside click and on Escape, or it traps people on mobile.
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // --- mark the current page in the nav ------------------------------------

  var here = location.pathname.replace(/index\.html$/, "");
  Array.prototype.forEach.call(document.querySelectorAll(".nav a:not(.btn)"), function (link) {
    var target = link.getAttribute("href");
    if (target && target !== "/" && here.indexOf(target) === 0) {
      link.setAttribute("aria-current", "page");
    }
  });

  // --- estimate form -------------------------------------------------------

  var form = document.getElementById("quote-form");
  if (!form) return;

  var status = form.querySelector(".form-status");
  var button = form.querySelector('button[type="submit"]');
  var action = form.getAttribute("action") || "";

  // Until a real form endpoint is configured, sending would silently fail.
  // Fall back to the visitor's email client so a lead is never lost.
  var configured = /^https?:\/\//.test(action) && action.indexOf("YOUR_FORM_ID") === -1;

  function say(message, ok) {
    if (!status) return;
    status.textContent = message;
    status.className = "form-status " + (ok ? "ok" : "bad");
  }

  form.addEventListener("submit", function (e) {
    if (!configured) {
      e.preventDefault();
      var data = new FormData(form);
      var jobs = data.getAll("job").join(", ");
      var body = [
        "Name: " + (data.get("name") || ""),
        "Phone: " + (data.get("phone") || ""),
        "Email: " + (data.get("email") || ""),
        "Town: " + (data.get("town") || ""),
        "Job: " + jobs,
        "",
        data.get("details") || "",
      ].join("\n");

      var mailto = form.dataset.fallbackEmail || document.querySelector('a[href^="mailto:"]');
      var address = typeof mailto === "string" ? mailto : mailto && mailto.getAttribute("href").slice(7);
      if (!address) return;

      window.location.href =
        "mailto:" + address +
        "?subject=" + encodeURIComponent("Estimate request from the website") +
        "&body=" + encodeURIComponent(body);

      say("Opening your email app — press send and we will get it.", true);
      return;
    }

    e.preventDefault();
    if (button) { button.disabled = true; button.textContent = "Sending…"; }
    say("", true);

    fetch(action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("bad status " + res.status);
        form.reset();
        say("Thanks — we have got it, and we will be in touch shortly.", true);
      })
      .catch(function () {
        say("That did not send. Please call us instead — it is the fastest way to reach us.", false);
      })
      .finally(function () {
        if (button) { button.disabled = false; button.textContent = "Send request"; }
      });
  });
})();
