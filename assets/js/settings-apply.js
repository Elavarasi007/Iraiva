/* ==========================================================================
   IRAIVA MINISTRIES
   assets/js/settings-apply.js

   STEP 4B7 SCOPE ONLY — APPLY SAVED SETTINGS TO THE PUBLIC WEBSITE
   --------------------------------------------------------------------------
   Reads window.IraivaSettingsData.getSettings() and, if a value has been
   saved, writes it into the matching public-site element by id. Every
   element is looked up defensively (if not found, that field is skipped)
   so this can never throw or break the rest of the page. Does NOT touch
   the Hero section, Hero video, Albums, Songs, Documents, Lyrics or Song
   Requests — only the small set of settings-related elements below.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", applySettings);

  async function applySettings() {
    if (!window.IraivaSettingsData) return;

    let settings;
    try {
      settings = await window.IraivaSettingsData.getSettings();
    } catch (err) {
      console.warn("IraivaSettingsApply: could not load settings.", err);
      return;
    }
    if (!settings) return;

    setText("contactEmailText", settings.contactEmail);
    setText("contactPhoneText", settings.contactPhone);
    setText("contactLocationText", settings.location);
    setText("footerCopyrightText", settings.footerCopyright);

    setHref("socialFacebookLink", settings.socialFacebook);
    setHref("socialInstagramLink", settings.socialInstagram);
    setHref("socialYoutubeLink", settings.socialYoutube);

    if (settings.siteName) {
      document.title = settings.siteName + " — Lyrics Library";
    }
  }

  function setText(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHref(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.href = value;
  }
})();
