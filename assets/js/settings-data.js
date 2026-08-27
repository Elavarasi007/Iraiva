/* ==========================================================================
   IRAIVA MINISTRIES
   assets/js/settings-data.js

   STEP 4B7 SCOPE ONLY — BASIC WEBSITE SETTINGS DATA LAYER
   --------------------------------------------------------------------------
   Shared, isolated data layer for simple website settings (ministry name,
   contact details, footer copyright text, social links). Loaded by BOTH the
   admin Settings page (admin/settings.html) and the public website
   (index.html), so a value saved in the admin panel is reflected on the
   public site and survives a page refresh.

   Kept completely separate from assets/js/data.js (albums/songs) and every
   other *-data.js file, so this step cannot affect Albums, Songs, Documents,
   Lyrics or Song Requests.

   Persisted to localStorage (shared across same-origin pages).

   Public API (window.IraivaSettingsData):
     getSettings()          -> Promise<settings>
     saveSettings(settings) -> Promise<settings>
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "iraivaSettings.v1";

  /* Seed values match the content already hard-coded on the public site,
     so the Settings page opens pre-filled with what visitors currently see. */
  const DEFAULT_SETTINGS = {
    siteName: "Iraiva Ministries",
    contactEmail: "info@iraivaministries.org",
    contactPhone: "+91 12345 67890",
    location: "Chennai, Tamil Nadu, India",
    footerCopyright: "Iraiva Ministries. All Rights Reserved.",
    socialFacebook: "",
    socialInstagram: "",
    socialYoutube: ""
  };

  let cache = null; // in-memory working set, mirrors localStorage once loaded

  /* ---------- storage helpers ---------- */

  function readStorage() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeStorage(settings) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      // localStorage may be unavailable (private mode / quota) — keep working
      // in-memory via `cache` for this tab.
      console.warn("IraivaSettingsData: could not persist to localStorage.", err);
    }
  }

  function ensureLoaded() {
    if (cache) return cache;
    const stored = readStorage();
    cache = Object.assign({}, DEFAULT_SETTINGS, stored && typeof stored === "object" ? stored : {});
    return cache;
  }

  /* ---------- public API ---------- */

  async function getSettings() {
    return Object.assign({}, ensureLoaded());
  }

  async function saveSettings(settings) {
    const current = ensureLoaded();
    const updated = Object.assign({}, current, {
      siteName: String((settings && settings.siteName) || "").trim() || current.siteName,
      contactEmail: String((settings && settings.contactEmail) || "").trim(),
      contactPhone: String((settings && settings.contactPhone) || "").trim(),
      location: String((settings && settings.location) || "").trim(),
      footerCopyright: String((settings && settings.footerCopyright) || "").trim() || current.footerCopyright,
      socialFacebook: String((settings && settings.socialFacebook) || "").trim(),
      socialInstagram: String((settings && settings.socialInstagram) || "").trim(),
      socialYoutube: String((settings && settings.socialYoutube) || "").trim()
    });
    cache = updated;
    writeStorage(updated);
    return Object.assign({}, updated);
  }

  global.IraivaSettingsData = {
    getSettings: getSettings,
    saveSettings: saveSettings
  };
})(window);
