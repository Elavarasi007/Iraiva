/* ==========================================================================
   IRAIVA MINISTRIES — LYRICS LIBRARY
   assets/js/song-documents.js

   STEP 4B-3 — PUBLIC-SITE DOCUMENT BRIDGE
   --------------------------------------------------------------------------
   The public website's song data (assets/js/data.js) is static. Song
   documents managed through the Admin Dashboard's Songs Management ->
   "Manage Documents" screen are persisted to localStorage under the same
   key admin/songs-data.js already uses ("iraivaAdmin.songs.v1") — this file
   does NOT introduce a separate storage architecture, it only reads that
   existing record so the public site's download buttons can reflect it.

   This is intentionally read-only and has no dependency on admin/songs-data.js
   (the public site never loads admin scripts), so it is safe to include on
   index.html by itself.
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "iraivaAdmin.songs.v1";

  function readAdminSongs() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  /* Returns the admin-managed { word, pdf, ppt } documents object for a
     song, or null if the admin dashboard has never been opened / has no
     record of this song (in which case the caller should keep whatever
     static documents assets/js/data.js already provided). */
  function getSongDocuments(songId) {
    const songs = readAdminSongs();
    if (!songs) return null;
    const song = songs.find(function (s) { return s.id === songId; });
    if (!song) return null;
    return song.documents || {};
  }

  /* True when a documents[type] entry is a file uploaded through the admin
     (an object carrying a data URL), as opposed to a legacy static path
     string like "assets/documents/word/song-1.docx". */
  function isUploadedDocument(entry) {
    return !!(entry && typeof entry === "object" && entry.dataUrl);
  }

  global.IraivaSongDocuments = {
    getSongDocuments: getSongDocuments,
    isUploadedDocument: isUploadedDocument
  };
})(window);
