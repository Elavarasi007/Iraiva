/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin.js

   STEP 4A SCOPE ONLY:
   This file wires up the dashboard SHELL (sidebar collapse, mobile drawer,
   nav active-state) and small cosmetic touches. It intentionally does NOT
   talk to any database, API or auth layer — those arrive in later steps.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const shell = document.getElementById("adminShell");
    const collapseBtn = document.getElementById("collapseBtn");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const scrim = document.getElementById("sidebarScrim");

    /* ---- desktop sidebar collapse ---- */
    if (collapseBtn && shell) {
      collapseBtn.addEventListener("click", function () {
        shell.classList.toggle("sidebar-collapsed");
      });
    }

    /* ---- mobile drawer ---- */
    function openDrawer() {
      shell.classList.add("sidebar-open");
      scrim.classList.add("visible");
      document.body.classList.add("scroll-lock");
    }
    function closeDrawer() {
      shell.classList.remove("sidebar-open");
      scrim.classList.remove("visible");
      document.body.classList.remove("scroll-lock");
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openDrawer);
    if (scrim) scrim.addEventListener("click", closeDrawer);

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeDrawer();
    });

    /* ---- close mobile drawer when a nav link is chosen ---- */
    document.querySelectorAll(".nav-item").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 900) closeDrawer();
      });
    });

    /* ---- footer year ---- */
    const footerYear = document.getElementById("footerYear");
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }
})();
