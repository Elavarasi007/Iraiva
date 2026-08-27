/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN LOGIN
   login.js

   STEP 4B5 SCOPE ONLY:
   Simple client-side demo authentication. Not production-grade security —
   no backend, no database, no framework.
   ========================================================================== */

(function () {
  "use strict";

  var SESSION_KEY = "iraivaAdminAuth";
  var DEMO_EMAIL = "admin@iraivaministries.org";
  var DEMO_PASSWORD = "IraivaAdmin@123";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    /* already logged in this browser session? skip straight to dashboard */
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      window.location.replace("index.html");
      return;
    }

    var form = document.getElementById("loginForm");
    var errorBox = document.getElementById("loginError");
    var emailInput = document.getElementById("loginEmail");
    var passwordInput = document.getElementById("loginPassword");
    var toggleBtn = document.getElementById("togglePassword");

    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener("click", function () {
        var isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        toggleBtn.classList.toggle("is-visible", isHidden);
      });
    }

    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var email = emailInput.value.trim();
      var password = passwordInput.value;

      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        errorBox.classList.remove("visible");
        sessionStorage.setItem(SESSION_KEY, "true");
        window.location.href = "index.html";
      } else {
        errorBox.textContent = "Incorrect email or password. Please try again.";
        errorBox.classList.add("visible");
        passwordInput.value = "";
        passwordInput.focus();
        form.classList.remove("shake");
        void form.offsetWidth; /* restart animation */
        form.classList.add("shake");
      }
    });
  }
})();
