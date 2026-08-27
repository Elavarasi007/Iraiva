/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin/songs-data.js

   STEP 4B-2 SCOPE ONLY — SONGS & LYRICS MANAGEMENT DATA LAYER
   --------------------------------------------------------------------------
   This is the ONLY place Songs Management reads/writes song data. It is
   deliberately isolated from assets/js/data.js so the PUBLIC WEBSITE is
   never touched by admin edits in this step (same pattern as
   admin/albums-data.js for Album Management).

   It reuses the exact STEP 3 song data shape (see assets/js/data.js,
   section 4) as its seed data via window.IraivaData.getSongs(), then
   layers create / update / delete on top, persisted to localStorage for
   development.

   FUTURE BACKEND SWAP
   --------------------------------------------------------------------------
   Every operation here is async and centralized behind window.IraivaSongsAdmin.
   When a real backend exists, only the bodies of these functions need to
   change to fetch()/POST/PUT/DELETE calls — nothing in songs.js (the UI
   layer) needs to change, because it only ever calls these named functions.

   DOCUMENT MANAGEMENT NOTE (STEP 4B-3)
   --------------------------------------------------------------------------
   Songs still carry a `documents` object ({ word, pdf, ppt }) purely so the
   Songs Management table can show Word / PDF / PPT availability pills. This
   step does NOT add any document upload UI — new songs are created with an
   empty `documents` object, and existing demo documents are left untouched.
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "iraivaAdmin.songs.v1";

  const VALID_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a", "audio/mp4"];
  const VALID_AUDIO_EXT = /\.(mp3|wav|ogg|m4a)$/i;

  /* ---------- STEP 4B-3: song document management ----------
     Documents are stored inline on each song record, in the same
     `documents` object the STEP 4B-2 seed data already ships ({ word, pdf,
     ppt }). A value is either:
       - a plain string (legacy/demo path under assets/documents/…), or
       - an object { fileName, fileSize, mimeType, dataUrl, uploadedAt }
         for a file uploaded through this admin, persisted as a data URL
         in the same localStorage record as the rest of the song.
     No separate storage key or architecture is introduced. */

  const DOC_TYPES = ["word", "pdf", "ppt"];
  const DOC_LABELS = { word: "Word", pdf: "PDF", ppt: "PowerPoint" };
  const DOC_EXT = { word: /\.docx$/i, pdf: /\.pdf$/i, ppt: /\.pptx$/i };
  const DOC_MIME = {
    word: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    pdf: ["application/pdf"],
    ppt: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"]
  };
  // Reasonable client-side ceiling for a localStorage-backed dev build —
  // several documents per song must fit under the browser's ~5-10MB quota.
  const MAX_DOC_SIZE = 3 * 1024 * 1024; // 3MB per file

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

  function writeStorage(songs) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
      return true;
    } catch (err) {
      // Most commonly QuotaExceededError, triggered by a large uploaded MP3
      // stored as a data URL. Previously this was only logged: the
      // in-memory `cache` still had the new audioFile, so the admin tab
      // kept "working" for the rest of that session, but nothing was
      // actually persisted — so a refresh (and the public site, which
      // reads localStorage fresh) kept showing the old song. Report
      // failure so callers can roll back and surface a real save error
      // instead of a false "success".
      console.warn("IraivaSongsAdmin: could not persist to localStorage.", err);
      return false;
    }
  }

  async function ensureLoaded() {
    if (cache) return cache;
    const stored = readStorage();
    if (stored && Array.isArray(stored)) {
      cache = stored;
      await migrateLegacyAudioIfNeeded(cache);
      return cache;
    }
    const seed = await global.IraivaData.getSongs(); // STEP 3 source of truth
    cache = seed.map(function (s) { return Object.assign({}, s); });
    writeStorage(cache);
    return cache;
  }

  /* Secondary contributor to the same regression: any song whose MP3 was
     uploaded before the IndexedDB audio storage existed still has its full
     base64 audio sitting inline in this array. writeStorage() always
     serializes the WHOLE array, so as long as even one such song remains
     un-migrated, saving ANY song (even just a title edit) can blow past
     the localStorage quota. This runs once per load and moves any
     leftover inline "data:" audio into IndexedDB via the same
     persistAudioIfNeeded() path used for new uploads (which now falls
     back safely if IndexedDB isn't available — see above). Never deletes
     or resets anything; a song that fails to migrate is simply left as-is
     and retried next load. */
  async function migrateLegacyAudioIfNeeded(songs) {
    let changed = false;
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      if (song && typeof song.audioFile === "string" && song.audioFile.indexOf("data:") === 0) {
        const migrated = await persistAudioIfNeeded(song.id, song.audioFile);
        if (migrated !== song.audioFile) {
          song.audioFile = migrated;
          changed = true;
        }
      }
    }
    if (changed) writeStorage(songs);
  }

  /* ---------- id / slug helpers ---------- */

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  function nextId(songs) {
    let max = 0;
    songs.forEach(function (s) {
      const match = /(\d+)$/.exec(String(s.id || ""));
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return "song-" + pad3(max + 1);
  }

  function nextTrackNumber(songs, albumId) {
    let max = 0;
    songs.forEach(function (s) {
      if (s.albumId === albumId && typeof s.trackNumber === "number") {
        max = Math.max(max, s.trackNumber);
      }
    });
    return max + 1;
  }

  /* ---------- lyrics helpers ---------- */

  /* Turns a plain multi-line textarea value into the { time, text } array
     the public player expects. Lines here are NOT time-synced by this
     function under any circumstance -- no line index, no fixed interval,
     no duration-based estimate. A line only ever gets a real time when
     matched (by exact text, position-aware for duplicates) against an
     existingLyrics array that already carries a real captured timestamp;
     otherwise it is time: null. Real timestamps are only ever WRITTEN by
     the actual capture paths: setLineTime()/captureNextLineFromSpacebar()
     in songs.js (Set Time / Quick Sync, backed by audio.currentTime) and
     saveSyncedLyrics()/parseLRC() below. */
  function linesToLyrics(text, existingLyrics) {
    const lines = String(text || "")
      .split("\n")
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; });

    const savedTimesByText = {};
    if (Array.isArray(existingLyrics)) {
      existingLyrics.forEach(function (l) {
        if (l && typeof l.time === "number" && l.text) {
          (savedTimesByText[l.text] = savedTimesByText[l.text] || []).push(l.time);
        }
      });
    }

    return lines.map(function (l) {
      const bucket = savedTimesByText[l];
      const time = (bucket && bucket.length) ? bucket.shift() : null;
      return { time: time, text: l };
    });
  }

  function lyricsToLines(lyrics) {
    if (!Array.isArray(lyrics)) return "";
    return lyrics.map(function (l) { return l.text; }).join("\n");
  }

  /* ---------- validation ---------- */

  function validateSongInput(input) {
    const errors = {};

    if (!input.title || !String(input.title).trim()) {
      errors.title = "Song title is required.";
    }
    if (!input.albumId) {
      errors.albumId = "Choose an album.";
    }
    if (!input.language) {
      errors.language = "Choose a language.";
    }
    if (input.trackNumber !== "" && input.trackNumber != null) {
      if (isNaN(input.trackNumber) || Number(input.trackNumber) < 1) {
        errors.trackNumber = "Song number must be a positive number.";
      }
    }

    return errors;
  }

  function isValidAudioFile(file) {
    if (!file) return true; // audio is optional
    const typeOk = VALID_AUDIO_TYPES.indexOf(file.type) !== -1;
    const extOk = VALID_AUDIO_EXT.test(file.name || "");
    return typeOk || extOk;
  }

  /* ---------- public read operations ---------- */

  async function getAllSongs() {
    const songs = await ensureLoaded();
    return songs.slice().sort(function (a, b) {
      if (a.albumId === b.albumId) return (a.trackNumber || 0) - (b.trackNumber || 0);
      return String(a.albumId).localeCompare(String(b.albumId));
    });
  }

  async function getSongById(id) {
    const songs = await ensureLoaded();
    return songs.find(function (s) { return s.id === id; }) || null;
  }

  /* ---------- public write operations ---------- */

  async function createSong(input) {
    const errors = validateSongInput(input);
    if (Object.keys(errors).length) {
      const err = new Error("Validation failed");
      err.fieldErrors = errors;
      throw err;
    }

    const songs = await ensureLoaded();
    const id = nextId(songs);
    const title = String(input.title).trim();
    const audioFile = await persistAudioIfNeeded(id, input.audioFile);

    const record = {
      id: id,
      albumId: input.albumId,
      trackNumber: input.trackNumber !== "" && input.trackNumber != null
        ? Number(input.trackNumber)
        : nextTrackNumber(songs, input.albumId),
      title: title,
      slug: slugify(title + "-" + id),
      artist: "Iraiva Ministries",
      language: input.language,
      duration: 240,
      audioFile: audioFile,
      coverImage: null,
      lyrics: linesToLyrics(input.lyrics),
      lyricsPreview: input.lyricsPreview ? String(input.lyricsPreview).trim() : "",
      documents: {},
      releaseDate: null,
      isPublished: !!input.isPublished,
      displayOrder: nextTrackNumber(songs, input.albumId)
    };

    songs.push(record);
    if (!writeStorage(songs)) {
      songs.pop();
      if (audioFile.indexOf("indexeddb:") === 0 && global.IraivaData && global.IraivaData.deleteAudioBlob) {
        global.IraivaData.deleteAudioBlob(id).catch(function () {});
      }
      const persistErr = new Error("Could not save this song. Please try again.");
      persistErr.code = "PERSIST_FAILED";
      throw persistErr;
    }
    return record;
  }

  async function updateSong(id, input) {
    const errors = validateSongInput(input);
    if (Object.keys(errors).length) {
      const err = new Error("Validation failed");
      err.fieldErrors = errors;
      throw err;
    }

    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === id; });
    if (idx === -1) throw new Error("Song not found: " + id);

    const existing = songs[idx];
    const title = String(input.title).trim();
    const audioFile = input.audioFile !== undefined
      ? await persistAudioIfNeeded(id, input.audioFile)
      : existing.audioFile;

    const updated = Object.assign({}, existing, {
      albumId: input.albumId,
      trackNumber: input.trackNumber !== "" && input.trackNumber != null
        ? Number(input.trackNumber)
        : existing.trackNumber,
      title: title,
      slug: slugify(title + "-" + id),
      language: input.language,
      audioFile: audioFile,
      lyrics: input.lyrics !== undefined ? linesToLyrics(input.lyrics, existing.lyrics) : existing.lyrics,
      lyricsPreview: input.lyricsPreview !== undefined ? String(input.lyricsPreview).trim() : existing.lyricsPreview,
      isPublished: !!input.isPublished
    });

    songs[idx] = updated;
    if (!writeStorage(songs)) {
      songs[idx] = existing; // keep in-memory cache consistent with what's actually on disk
      const persistErr = new Error("Could not save changes. Please try again.");
      persistErr.code = "PERSIST_FAILED";
      throw persistErr;
    }
    return updated;
  }

  async function deleteSong(id) {
    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return false;
    songs.splice(idx, 1);
    writeStorage(songs);
    return true;
  }

  /* Escape hatch back to the original STEP 3 demo data — handy while
     testing, not exposed in the UI by default. */
  async function resetToSeed() {
    const seed = await global.IraivaData.getSongs();
    cache = seed.map(function (s) { return Object.assign({}, s); });
    writeStorage(cache);
    return cache;
  }

  /* ---------- audio file handling ---------- */

  /* Converts a data: URL (what the upload flow already produces) into a
     Blob so it can be handed to IraivaData.saveAudioBlob() for IndexedDB
     storage instead of being embedded in the localStorage song record. */
  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const meta = parts[0] || "";
    const base64 = parts[1] || "";
    const mimeMatch = /data:(.*?);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : "";
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  /* Given a freshly-uploaded audio value (a "data:" URL) and the song id
     it belongs to, stores it in IndexedDB and returns the lightweight
     "indexeddb:<id>" marker to persist in the song record instead of the
     full data URL. Any non-"data:" value (empty string, a real path, an
     http(s) URL, or an existing "indexeddb:" marker left unchanged) is
     returned as-is — this only ever runs for genuinely new uploads. */
  async function persistAudioIfNeeded(songId, audioFileValue) {
    if (!audioFileValue || audioFileValue.indexOf("data:") !== 0) {
      return audioFileValue || "";
    }
    /* ROOT-CAUSE FIX: IndexedDB is the PREFERRED place for large MP3s (it
       keeps them out of the localStorage quota), but it must never be the
       reason a song fails to save. Previously, if global.IraivaData /
       saveAudioBlob was unavailable, or the IndexedDB write failed for any
       reason (blocked storage, browser/privacy restrictions, etc.), this
       threw and the whole song save was aborted with "Something went
       wrong" — even for a brand-new song with no pre-existing data. That
       is the actual regression: it made every MP3 upload depend on
       IndexedDB succeeding, which the pre-synced-lyrics code never
       required.
       Now, if IndexedDB isn't available or the save to it fails, this
       falls back to the ORIGINAL, already-proven mechanism the project
       used before — keeping the audio inline as a data: URL directly on
       the song record, in the same persistent "iraivaAdmin.songs.v1"
       localStorage record as everything else (not a new storage system,
       not a temporary/runtime-only value). The song save can then
       continue normally; only if that fallback write is itself too large
       for localStorage will writeStorage() report a real, honest
       "please try again" for that specific save. */
    if (global.IraivaData && global.IraivaData.saveAudioBlob) {
      try {
        const blob = dataUrlToBlob(audioFileValue);
        await global.IraivaData.saveAudioBlob(songId, blob);
        return "indexeddb:" + songId;
      } catch (err) {
        console.warn("IraivaSongsAdmin: IndexedDB audio save failed, falling back to inline storage for " + songId, err);
      }
    }
    return audioFileValue;
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  /* Resolves a stored audioFile value to a path/URL usable from inside
     /admin/ — a data: URL or http(s)/absolute URL from before this
     storage change (used as-is), a project-relative demo path like
     "assets/audio/demo-song.mp3" (prefixed with "../"), or an
     "indexeddb:<songId>" marker for audio saved in IndexedDB (resolved to
     a temporary Blob object URL). Async because IndexedDB reads are async;
     the one caller (the admin player preview) already awaits it. */
  async function resolveAudioSrc(audioFile) {
    if (!audioFile) return "";
    if (audioFile.indexOf("indexeddb:") === 0) {
      const songId = audioFile.slice("indexeddb:".length);
      if (!global.IraivaData || !global.IraivaData.getAudioBlob) return "";
      try {
        const blob = await global.IraivaData.getAudioBlob(songId);
        return blob ? URL.createObjectURL(blob) : "";
      } catch (err) {
        return "";
      }
    }
    if (/^(data:|https?:|\/\/)/i.test(audioFile)) return audioFile;
    if (audioFile.indexOf("../") === 0) return audioFile;
    return "../" + audioFile;
  }

  /* ---------- document read/write operations ---------- */

  function isUploadedDocument(entry) {
    return !!(entry && typeof entry === "object" && entry.dataUrl);
  }

  function validateDocumentFile(type, file) {
    if (DOC_TYPES.indexOf(type) === -1) {
      const err = new Error("Unsupported document type: " + type);
      err.code = "INVALID_TYPE";
      throw err;
    }
    if (!file) {
      const err = new Error("No file provided.");
      err.code = "NO_FILE";
      throw err;
    }
    const extOk = DOC_EXT[type].test(file.name || "");
    const mimeOk = !file.type || DOC_MIME[type].indexOf(file.type) !== -1;
    if (!extOk || !mimeOk) {
      const err = new Error("Only ." + type.replace("ppt", "pptx").replace("word", "docx") + " files are accepted for " + DOC_LABELS[type] + ".");
      err.code = "INVALID_TYPE";
      throw err;
    }
    if (file.size > MAX_DOC_SIZE) {
      const err = new Error("That file is too large. Maximum size is " + Math.round(MAX_DOC_SIZE / (1024 * 1024)) + "MB.");
      err.code = "TOO_LARGE";
      throw err;
    }
  }

  async function getSongDocuments(songId) {
    const songs = await ensureLoaded();
    const song = songs.find(function (s) { return s.id === songId; });
    if (!song) throw new Error("Song not found: " + songId);
    return Object.assign({}, song.documents || {});
  }

  async function saveSongDocument(songId, type, file) {
    validateDocumentFile(type, file);

    const dataUrl = await readFileAsDataUrl(file);

    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === songId; });
    if (idx === -1) throw new Error("Song not found: " + songId);

    const docs = Object.assign({}, songs[idx].documents || {});
    docs[type] = {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "",
      dataUrl: dataUrl,
      uploadedAt: new Date().toISOString()
    };

    songs[idx] = Object.assign({}, songs[idx], { documents: docs });
    writeStorage(songs);
    return docs[type];
  }

  async function deleteSongDocument(songId, type) {
    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === songId; });
    if (idx === -1) throw new Error("Song not found: " + songId);

    const docs = Object.assign({}, songs[idx].documents || {});
    if (!docs[type]) return false;
    delete docs[type];

    songs[idx] = Object.assign({}, songs[idx], { documents: docs });
    writeStorage(songs);
    return true;
  }

  /* ---------- STEP 4B-4: simple lyrics management ----------
     Lyrics already live inline on each song record (the `lyrics` array
     used by createSong/updateSong above), persisted in the same
     "iraivaAdmin.songs.v1" localStorage record — no new storage key or
     architecture. These two functions are just a minimal, focused way for
     the "Manage Lyrics" modal to read/write only the lyrics field without
     going through the full song validation form. */

  async function getLyrics(songId) {
    const songs = await ensureLoaded();
    const song = songs.find(function (s) { return s.id === songId; });
    if (!song) throw new Error("Song not found: " + songId);
    return lyricsToLines(song.lyrics);
  }

  async function saveLyrics(songId, lyricsText) {
    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === songId; });
    if (idx === -1) throw new Error("Song not found: " + songId);

    songs[idx] = Object.assign({}, songs[idx], { lyrics: linesToLyrics(lyricsText, songs[idx].lyrics) });
    writeStorage(songs);
    return lyricsToLines(songs[idx].lyrics);
  }

  /* ---------- SYNCED LYRICS (new feature, additive only) ----------
     Both paths below write straight into the existing `lyrics` field
     (the { time, text } array the public site already reads for
     Spotify-style sync) — no new storage key, no schema change.
     getLyrics/saveLyrics above are untouched and keep working exactly
     as before for the plain-text editor. */

  /* Standard LRC parser: [mm:ss.xx]line text, supports multiple time
     tags on one line, ignores metadata tags ([ar:], [ti:], etc.) and
     blank/untimed lines. */
  function parseLRC(lrcText) {
    const lines = String(lrcText || "").split(/\r?\n/);
    const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    const out = [];

    lines.forEach(function (line) {
      const tags = [];
      let match;
      timeTag.lastIndex = 0;
      while ((match = timeTag.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
        tags.push(min * 60 + sec + ms / 1000);
      }
      if (!tags.length) return; // metadata line or plain line with no timestamp
      const text = line.replace(timeTag, "").trim();
      if (!text) return;
      tags.forEach(function (t) { out.push({ time: t, text: text }); });
    });

    out.sort(function (a, b) { return a.time - b.time; });
    return out;
  }

  /* Shared save path for both LRC import and the manual Sync Editor.
     timedLines: [{ time: number, text: string }]. Saved only against
     the given songId — cannot affect any other song's record. */
  async function saveSyncedLyrics(songId, timedLines) {
    if (!Array.isArray(timedLines) || !timedLines.length) {
      const err = new Error("No timed lyric lines to save.");
      err.code = "EMPTY_SYNC";
      throw err;
    }
    /* ROOT-CAUSE FIX: `Number(l.time) || 0` silently turned a missing or
       invalid timestamp (null, undefined, NaN) into a REAL 0-second
       timestamp -- indistinguishable from a line genuinely, manually
       synced to 0:00. That is exactly how an "automatic" timestamp could
       sneak back into saved data. A line only ever keeps a numeric time
       here if it is actually a valid captured number; anything else
       stays null (unsynced), never 0. */
    const cleaned = timedLines
      .map(function (l) {
        const t = (typeof l.time === "number" && isFinite(l.time) && l.time >= 0) ? l.time : null;
        return { time: t, text: String(l.text || "").trim() };
      })
      .filter(function (l) { return l.text.length > 0; })
      .sort(function (a, b) {
        // Never coerce an unsynced (null) line into 0 for sorting --
        // keep real timestamps in order and push unsynced lines last.
        if (a.time === null && b.time === null) return 0;
        if (a.time === null) return 1;
        if (b.time === null) return -1;
        return a.time - b.time;
      });

    if (!cleaned.length) {
      const err = new Error("No timed lyric lines to save.");
      err.code = "EMPTY_SYNC";
      throw err;
    }

    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === songId; });
    if (idx === -1) throw new Error("Song not found: " + songId);

    const existing = songs[idx];
    songs[idx] = Object.assign({}, existing, { lyrics: cleaned });
    if (!writeStorage(songs)) {
      songs[idx] = existing; // roll back in-memory cache to match what's actually persisted
      const persistErr = new Error("Could not save synced lyrics. Please try again.");
      persistErr.code = "PERSIST_FAILED";
      throw persistErr;
    }
    return cleaned;
  }

  /* ---------- Clear bad/demo timestamps (data cleanup, additive) ----------
     A song's existing localStorage record may already carry auto-generated
     demo timestamps (0, 6, 12, 18 ... one every 6 seconds) written before
     manual timing existed. On disk those look exactly like a real saved
     time -- a plain number on song.lyrics[i].time -- so nothing else in
     this file can tell "bad demo timestamp" apart from "real manual
     timestamp" automatically. This gives a single, explicit, targeted way
     to reset them: it clears ONLY the `time` field (back to null, i.e.
     "--:--") on the given song's lyrics, keeping every line's text and
     order exactly as-is. It never touches title, album, audio, images,
     documents, or any other song's data, and never deletes the lyrics
     array itself -- only the timestamps inside it. */
  async function clearSyncTimestamps(songId) {
    const songs = await ensureLoaded();
    const idx = songs.findIndex(function (s) { return s.id === songId; });
    if (idx === -1) throw new Error("Song not found: " + songId);

    const existing = songs[idx];
    const clearedLyrics = Array.isArray(existing.lyrics)
      ? existing.lyrics.map(function (l) { return { time: null, text: (l && l.text) ? l.text : "" }; })
      : existing.lyrics;

    songs[idx] = Object.assign({}, existing, { lyrics: clearedLyrics });
    if (!writeStorage(songs)) {
      songs[idx] = existing; // roll back in-memory cache to match what's actually persisted
      const persistErr = new Error("Could not clear timestamps. Please try again.");
      persistErr.code = "PERSIST_FAILED";
      throw persistErr;
    }
    return clearedLyrics;
  }

  async function importLyricsFromLRC(songId, lrcText) {
    const parsed = parseLRC(lrcText);
    if (!parsed.length) {
      const err = new Error("No valid timestamped lines found in that LRC file.");
      err.code = "INVALID_LRC";
      throw err;
    }
    return saveSyncedLyrics(songId, parsed);
  }

  /* ---------- Public-site bridge (fixes synced-lyrics hookup) ----------
     script.js (the public site) already calls
     window.IraivaSongLyrics.getLyrics(songId) expecting a SYNCHRONOUS
     result: the song's { time, text } lyrics array if this admin has a
     saved record for it, otherwise null. That object never existed, so
     timestamps set in the Sync Editor never reached the public player.
     This reads the same localStorage record used by IraivaSongsAdmin
     above (read-only, no cache/seed writes), keyed by songId, so it
     never affects any other song and never touches admin behavior. */
  global.IraivaSongLyrics = {
    getLyrics: function (songId) {
      const stored = readStorage();
      if (!stored || !Array.isArray(stored)) return null;
      const song = stored.find(function (s) { return s.id === songId; });
      if (!song || !Array.isArray(song.lyrics) || !song.lyrics.length) return null;
      // Defensive filter: only ever hand the public player lines that have
      // a REAL captured timestamp (a number). Unsynced lines now carry
      // time: null (see linesToLyrics fix above) and must never reach the
      // player, so a line can't be shown before its actual saved time.
      const timed = song.lyrics.filter(function (l) { return l && typeof l.time === "number"; });
      return timed.length ? timed : null;
    }
  };

  global.IraivaSongsAdmin = {
    getAllSongs: getAllSongs,
    getSongById: getSongById,
    createSong: createSong,
    updateSong: updateSong,
    deleteSong: deleteSong,
    resetToSeed: resetToSeed,
    isValidAudioFile: isValidAudioFile,
    readFileAsDataUrl: readFileAsDataUrl,
    resolveAudioSrc: resolveAudioSrc,
    lyricsToLines: lyricsToLines,
    // STEP 4B-4 — lyrics management
    getLyrics: getLyrics,
    saveLyrics: saveLyrics,
    // Synced lyrics (LRC import + manual sync editor)
    parseLRC: parseLRC,
    saveSyncedLyrics: saveSyncedLyrics,
    importLyricsFromLRC: importLyricsFromLRC,
    clearSyncTimestamps: clearSyncTimestamps,
    // STEP 4B-3 — document management
    DOC_TYPES: DOC_TYPES,
    DOC_LABELS: DOC_LABELS,
    MAX_DOC_SIZE: MAX_DOC_SIZE,
    isUploadedDocument: isUploadedDocument,
    getSongDocuments: getSongDocuments,
    saveSongDocument: saveSongDocument,
    deleteSongDocument: deleteSongDocument
  };
})(window);