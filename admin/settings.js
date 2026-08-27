/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin/settings.js

   STEP 4B7 SCOPE ONLY — MINIMAL ADMIN SETTINGS (UI layer)
   --------------------------------------------------------------------------
   Reads/writes settings data exclusively through window.IraivaSettingsData
   (assets/js/settings-data.js). Follows the same structure as requests.js:
   DOM cache, load(), form submit, toasts. Does not touch Albums, Songs,
   Documents, Lyrics or Song Requests in any way.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  const dom = {};

  function init() {
    dom.form = document.getElementById("settingsForm");
    dom.siteName = document.getElementById("siteName");
    dom.contactEmail = document.getElementById("contactEmail");
    dom.contactPhone = document.getElementById("contactPhone");
    dom.siteLocation = document.getElementById("siteLocation");
    dom.footerCopyright = document.getElementById("footerCopyright");
    dom.socialFacebook = document.getElementById("socialFacebook");
    dom.socialInstagram = document.getElementById("socialInstagram");
    dom.socialYoutube = document.getElementById("socialYoutube");
    dom.saveBtn = document.getElementById("settingsSaveBtn");
    dom.toastStack = document.getElementById("toastStack");

    dom.form.addEventListener("submit", onSubmit);

    loadSettings();
  }

  async function loadSettings() {
    try {
      const settings = await window.IraivaSettingsData.getSettings();
      dom.siteName.value = settings.siteName || "";
      dom.contactEmail.value = settings.contactEmail || "";
      dom.contactPhone.value = settings.contactPhone || "";
      dom.siteLocation.value = settings.location || "";
      dom.footerCopyright.value = settings.footerCopyright || "";
      dom.socialFacebook.value = settings.socialFacebook || "";
      dom.socialInstagram.value = settings.socialInstagram || "";
      dom.socialYoutube.value = settings.socialYoutube || "";
    } catch (err) {
      showToast("error", "Could not load settings. Please refresh the page.");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    dom.saveBtn.disabled = true;

    try {
      await window.IraivaSettingsData.saveSettings({
        siteName: dom.siteName.value,
        contactEmail: dom.contactEmail.value,
        contactPhone: dom.contactPhone.value,
        location: dom.siteLocation.value,
        footerCopyright: dom.footerCopyright.value,
        socialFacebook: dom.socialFacebook.value,
        socialInstagram: dom.socialInstagram.value,
        socialYoutube: dom.socialYoutube.value
      });
      showToast("success", "Settings saved.");
    } catch (err) {
      showToast("error", "Could not save settings. Please try again.");
    } finally {
      dom.saveBtn.disabled = false;
    }
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function showToast(type, message) {
    const icon = type === "success"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>';

    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = icon + "<span>" + escapeHtml(message) + "</span>";
    dom.toastStack.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      setTimeout(function () { toast.remove(); }, 260);
    }, 3200);
  }
})();
