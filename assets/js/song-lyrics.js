/* ==========================================================================
   IRAIVA MINISTRIES — LYRICS LIBRARY
   assets/js/song-lyrics.js

   STEP 4B-4 — PUBLIC-SITE LYRICS BRIDGE
   --------------------------------------------------------------------------
   The public website's song data (assets/js/data.js) is static. Lyrics
   managed through the Admin Dashboard's Songs Management -> "Manage
   Lyrics" screen are persisted to localStorage under the same key
   admin/songs-data.js already uses ("iraivaAdmin.songs.v1") — this file
   does NOT introduce a separate storage architecture, it only reads that
   existing record so the public player can reflect it.

   This is intentionally read-only and has no dependency on
   admin/songs-data.js (the public site never loads admin scripts), so it
   is safe to include on index.html by itself. Same pattern as
   assets/js/song-documents.js.
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

  /* Returns the admin-managed lyrics array ({ time, text }[]) for a song,
     or null if the admin dashboard has never been opened / has no record
     of this song (in which case the caller should keep whatever static
     lyrics assets/js/data.js already provided). An empty array is a valid,
     real result — it means the admin cleared the lyrics on purpose. */
  function getLyrics(songId) {
    const songs = readAdminSongs();
    if (!songs) return null;
    const song = songs.find(function (s) { return s.id === songId; });
    if (!song) return null;
    return Array.isArray(song.lyrics) ? song.lyrics : [];
  }

  global.IraivaSongLyrics = {
    getLyrics: getLyrics
  };
})(window);
