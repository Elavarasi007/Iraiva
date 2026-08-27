/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN AUTH GUARD
   auth.js

   STEP 4B5 SCOPE ONLY:
   Minimal client-side dev auth. Protects admin/index.html, admin/albums.html
   and admin/songs.html by checking a sessionStorage flag set by login.html.
   Not production-grade security — no backend, no database.
   ========================================================================== */

(function () {
  "use strict";

  var SESSION_KEY = "iraivaAdminAuth";

  /* ---- guard: run immediately, before the page paints ---- */
  if (sessionStorage.getItem(SESSION_KEY) !== "true") {
    window.location.replace("login.html");
  }

  /* ---- wire up the existing Logout button once DOM is ready ---- */
  document.addEventListener("DOMContentLoaded", function () {
    var logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "login.html";
      });
    }
  });
})();
