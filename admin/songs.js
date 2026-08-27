/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin/songs.js

   STEP 4B-2 SCOPE ONLY — SONGS & LYRICS MANAGEMENT UI
   --------------------------------------------------------------------------
   Talks ONLY to window.IraivaSongsAdmin (admin/songs-data.js) for song
   reads/writes, and window.IraivaAlbumsAdmin (admin/albums-data.js, reused
   from STEP 4B-1) for the album list used in filters and the Add/Edit form.
   Never touches the public website's assets/js/data.js directly, and never
   reaches into localStorage itself — that stays fully inside the data
   layers so a backend can replace it later without any change here.
   ========================================================================== */

(function () {
  "use strict";

  let allSongs = [];         // last loaded full song set, joined with album info
  let allAlbums = [];        // full admin album list, for filters + form select
  let allLanguages = [];     // from IraivaData.getLanguages()
  let searchTerm = "";
  let albumFilter = "all";
  let languageFilter = "all";
  let publishedFilter = "all";
  let editingId = null;      // null => Add mode
  let pendingAudioDataUrl = null;
  let deleteTargetId = null;
  let viewingId = null;
  let docsSongId = null;         // song currently open in the Manage Documents modal
  let deleteDocTarget = null;    // { songId, type } pending removal confirmation
  let lyricsSongId = null;       // song currently open in the Manage Lyrics modal

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindToolbar();
    bindSongModal();
    bindViewModal();
    bindDeleteModal();
    bindPlayerModal();
    bindDocumentsModal();
    bindLyricsModal();
    await loadReferenceData();
    await loadAndRender();
  }

  /* ---------------------------------------------------------------------
     DOM references
     --------------------------------------------------------------------- */
  const dom = {};
  function cacheDom() {
    dom.tableBody = document.getElementById("songsTableBody");
    dom.searchInput = document.getElementById("songSearchInput");
    dom.albumFilterSelect = document.getElementById("albumFilterSelect");
    dom.languageFilterSelect = document.getElementById("languageFilterSelect");
    dom.publishedFilterSelect = document.getElementById("publishedFilterSelect");
    dom.clearFiltersBtn = document.getElementById("clearFiltersBtn");
    dom.resultsMeta = document.getElementById("resultsMeta");
    dom.addSongBtn = document.getElementById("addSongBtn");

    dom.songModalOverlay = document.getElementById("songModalOverlay");
    dom.songModalTitle = document.getElementById("songModalTitle");
    dom.songForm = document.getElementById("songForm");
    dom.songModalCloseBtn = document.getElementById("songModalCloseBtn");
    dom.songCancelBtn = document.getElementById("songCancelBtn");
    dom.songSaveBtn = document.getElementById("songSaveBtn");

    dom.fieldTitle = document.getElementById("songTitle");
    dom.fieldAlbum = document.getElementById("songAlbum");
    dom.fieldLanguage = document.getElementById("songLanguage");
    dom.fieldNumber = document.getElementById("songNumber");
    dom.fieldLyricsPreview = document.getElementById("songLyricsPreview");
    dom.fieldLyrics = document.getElementById("songLyrics");
    dom.fieldPublished = document.getElementById("songPublished");

    dom.audioFileInput = document.getElementById("audioFileInput");
    dom.chooseAudioBtn = document.getElementById("chooseAudioBtn");
    dom.uploadDropzone = document.getElementById("uploadDropzone");
    dom.uploadPreview = document.getElementById("uploadPreview");
    dom.uploadFilename = document.getElementById("uploadFilename");

    dom.viewModalOverlay = document.getElementById("viewModalOverlay");
    dom.viewModalBody = document.getElementById("viewModalBody");
    dom.viewModalCloseBtn = document.getElementById("viewModalCloseBtn");
    dom.viewCloseBtn = document.getElementById("viewCloseBtn");
    dom.viewEditBtn = document.getElementById("viewEditBtn");

    dom.deleteModalOverlay = document.getElementById("deleteModalOverlay");
    dom.deleteSongName = document.getElementById("deleteSongName");
    dom.deleteCancelBtn = document.getElementById("deleteCancelBtn");
    dom.deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
    dom.deleteModalCloseBtn = document.getElementById("deleteModalCloseBtn");

    dom.playerModalOverlay = document.getElementById("playerModalOverlay");
    dom.playerModalCloseBtn = document.getElementById("playerModalCloseBtn");
    dom.playerSongTitle = document.getElementById("playerSongTitle");
    dom.playerAlbumName = document.getElementById("playerAlbumName");
    dom.playerPlayBtn = document.getElementById("playerPlayBtn");
    dom.playIcon = document.getElementById("playIcon");
    dom.pauseIcon = document.getElementById("pauseIcon");
    dom.playerProgress = document.getElementById("playerProgress");
    dom.playerCurrentTime = document.getElementById("playerCurrentTime");
    dom.playerDuration = document.getElementById("playerDuration");
    dom.previewAudio = document.getElementById("previewAudio");

    dom.toastStack = document.getElementById("toastStack");

    dom.documentsModalOverlay = document.getElementById("documentsModalOverlay");
    dom.documentsModalCloseBtn = document.getElementById("documentsModalCloseBtn");
    dom.documentsDoneBtn = document.getElementById("documentsDoneBtn");
    dom.docsSongTitle = document.getElementById("docsSongTitle");
    dom.docsSongAlbum = document.getElementById("docsSongAlbum");
    dom.docsSongLanguage = document.getElementById("docsSongLanguage");
    dom.docRowsWrap = document.getElementById("docRowsWrap");

    dom.deleteDocModalOverlay = document.getElementById("deleteDocModalOverlay");
    dom.deleteDocModalCloseBtn = document.getElementById("deleteDocModalCloseBtn");
    dom.deleteDocCancelBtn = document.getElementById("deleteDocCancelBtn");
    dom.deleteDocConfirmBtn = document.getElementById("deleteDocConfirmBtn");
    dom.deleteDocLabel = document.getElementById("deleteDocLabel");

    dom.lyricsModalOverlay = document.getElementById("lyricsModalOverlay");
    dom.lyricsModalCloseBtn = document.getElementById("lyricsModalCloseBtn");
    dom.lyricsSongTitle = document.getElementById("lyricsSongTitle");
    dom.lyricsSongAlbum = document.getElementById("lyricsSongAlbum");
    dom.lyricsSongLanguage = document.getElementById("lyricsSongLanguage");
    dom.lyricsTextarea = document.getElementById("lyricsTextarea");
    dom.lyricsClearBtn = document.getElementById("lyricsClearBtn");
    dom.lyricsSaveBtn = document.getElementById("lyricsSaveBtn");
  }

  /* ---------------------------------------------------------------------
     Reference data: albums (for filters + form) and languages (for form)
     --------------------------------------------------------------------- */
  async function loadReferenceData() {
    const [albums, languages] = await Promise.all([
      window.IraivaAlbumsAdmin.getAll(),
      window.IraivaData.getLanguages()
    ]);
    allAlbums = albums;
    allLanguages = languages;

    // Album filter dropdown
    dom.albumFilterSelect.innerHTML = '<option value="all">All Albums</option>' +
      allAlbums.map(function (a) {
        return '<option value="' + a.id + '">' + escapeHtml(a.name) + "</option>";
      }).join("");

    // Language filter dropdown
    dom.languageFilterSelect.innerHTML = '<option value="all">All Languages</option>' +
      allLanguages.map(function (l) {
        return '<option value="' + escapeHtml(l.name) + '">' + escapeHtml(l.name) + "</option>";
      }).join("");

    // Add/Edit form album select
    dom.fieldAlbum.innerHTML = allAlbums.map(function (a) {
      return '<option value="' + a.id + '">' + escapeHtml(a.name) + "</option>";
    }).join("");

    // Add/Edit form language select
    dom.fieldLanguage.innerHTML = allLanguages.map(function (l) {
      return '<option value="' + escapeHtml(l.name) + '">' + escapeHtml(l.name) + "</option>";
    }).join("");
  }

  function albumNameById(id) {
    const album = allAlbums.find(function (a) { return a.id === id; });
    return album ? album.name : "Unknown Album";
  }

  /* ---------------------------------------------------------------------
     Loading + rendering
     --------------------------------------------------------------------- */
  async function loadAndRender() {
    const songs = await window.IraivaSongsAdmin.getAllSongs();
    allSongs = songs.map(function (s) {
      return Object.assign({}, s, { _albumName: albumNameById(s.albumId) });
    });
    renderTable();
  }

  function matchesFilters(song) {
    if (albumFilter !== "all" && song.albumId !== albumFilter) return false;
    if (languageFilter !== "all" && song.language !== languageFilter) return false;
    if (publishedFilter === "published" && !song.isPublished) return false;
    if (publishedFilter === "unpublished" && song.isPublished) return false;
    if (searchTerm) {
      const haystack = (song.title + " " + song._albumName + " " + song.language).toLowerCase();
      if (haystack.indexOf(searchTerm) === -1) return false;
    }
    return true;
  }

  function getFilteredSongs() {
    return allSongs.filter(matchesFilters);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderTable() {
    const list = getFilteredSongs();
    dom.resultsMeta.textContent = list.length + (list.length === 1 ? " song found" : " songs found");

    if (!list.length) {
      dom.tableBody.innerHTML =
        '<tr><td colspan="8"><div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>' +
        "<strong>No songs found</strong>" +
        "<p>Try a different search term or filter, or add a new song.</p>" +
        "</div></td></tr>";
      return;
    }

    dom.tableBody.innerHTML = list.map(renderRow).join("");

    dom.tableBody.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { openViewModal(btn.getAttribute("data-view")); });
    });
    dom.tableBody.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openEditModal(btn.getAttribute("data-edit")); });
    });
    dom.tableBody.querySelectorAll("[data-docs]").forEach(function (btn) {
      btn.addEventListener("click", function () { openDocumentsModal(btn.getAttribute("data-docs")); });
    });
    dom.tableBody.querySelectorAll("[data-lyrics]").forEach(function (btn) {
      btn.addEventListener("click", function () { openLyricsModal(btn.getAttribute("data-lyrics")); });
    });
    dom.tableBody.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { openDeleteModal(btn.getAttribute("data-delete")); });
    });
    dom.tableBody.querySelectorAll("[data-play]").forEach(function (btn) {
      btn.addEventListener("click", function () { openPlayerModal(btn.getAttribute("data-play")); });
    });
  }

  function docPills(documents) {
    const docs = documents || {};
    const items = [
      { key: "word", label: "WORD" },
      { key: "pdf", label: "PDF" },
      { key: "ppt", label: "PPT" }
    ];
    return '<div class="doc-pills">' + items.map(function (d) {
      const has = !!docs[d.key];
      return '<span class="doc-pill ' + (has ? "avail" : "unavail") + '">' + d.label + "</span>";
    }).join("") + "</div>";
  }

  function renderRow(song) {
    const publishedPill = song.isPublished
      ? '<span class="mini-pill on"><span class="dot"></span>Published</span>'
      : '<span class="mini-pill off"><span class="dot"></span>Unpublished</span>';

    const hasAudio = !!song.audioFile;
    const audioPill = hasAudio
      ? '<span class="mini-pill on"><span class="dot"></span>Available</span>'
      : '<span class="mini-pill off"><span class="dot"></span>None</span>';

    const preview = song.lyricsPreview || (Array.isArray(song.lyrics) && song.lyrics[0] ? song.lyrics[0].text : "");

    return (
      '<tr>' +
        '<td class="song-title-cell" data-label="Song Title"><strong>' + escapeHtml(song.title) + "</strong>" +
          (preview ? "<small>" + escapeHtml(preview) + "</small>" : "") +
        "</td>" +
        '<td data-label="Album">' + escapeHtml(song._albumName) + "</td>" +
        '<td data-label="Language">' + escapeHtml(song.language) + "</td>" +
        '<td data-label="Song #">' + (song.trackNumber || "—") + "</td>" +
        '<td data-label="Published">' + publishedPill + "</td>" +
        '<td data-label="Audio">' + audioPill + "</td>" +
        '<td data-label="Documents">' + docPills(song.documents) + "</td>" +
        '<td data-label="Actions"><div class="row-actions">' +
          '<button type="button" class="btn btn-icon" data-view="' + song.id + '" aria-label="View ' + escapeHtml(song.title) + '" title="View">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>' +
          "</button>" +
          '<button type="button" class="btn btn-icon" data-edit="' + song.id + '" aria-label="Edit ' + escapeHtml(song.title) + '" title="Edit">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>' +
          "</button>" +
          '<button type="button" class="btn btn-icon" data-docs="' + song.id + '" aria-label="Manage documents for ' + escapeHtml(song.title) + '" title="Manage Documents">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>' +
          "</button>" +
          '<button type="button" class="btn btn-icon" data-lyrics="' + song.id + '" aria-label="Manage lyrics for ' + escapeHtml(song.title) + '" title="Manage Lyrics">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>' +
          "</button>" +
          '<button type="button" class="btn btn-icon play" data-play="' + song.id + '" aria-label="Play ' + escapeHtml(song.title) + '" title="Play Audio"' + (hasAudio ? "" : " disabled") + '>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>' +
          "</button>" +
          '<button type="button" class="btn btn-icon danger" data-delete="' + song.id + '" aria-label="Delete ' + escapeHtml(song.title) + '" title="Delete">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>' +
          "</button>" +
        "</div></td>" +
      "</tr>"
    );
  }

  /* ---------------------------------------------------------------------
     Toolbar: search + filters
     --------------------------------------------------------------------- */
  function bindToolbar() {
    let debounceTimer = null;
    dom.searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      const value = dom.searchInput.value;
      debounceTimer = setTimeout(function () {
        searchTerm = value.trim().toLowerCase();
        renderTable();
      }, 150);
    });

    dom.albumFilterSelect.addEventListener("change", function () {
      albumFilter = dom.albumFilterSelect.value;
      renderTable();
    });
    dom.languageFilterSelect.addEventListener("change", function () {
      languageFilter = dom.languageFilterSelect.value;
      renderTable();
    });
    dom.publishedFilterSelect.addEventListener("change", function () {
      publishedFilter = dom.publishedFilterSelect.value;
      renderTable();
    });

    dom.clearFiltersBtn.addEventListener("click", function () {
      searchTerm = "";
      albumFilter = "all";
      languageFilter = "all";
      publishedFilter = "all";
      dom.searchInput.value = "";
      dom.albumFilterSelect.value = "all";
      dom.languageFilterSelect.value = "all";
      dom.publishedFilterSelect.value = "all";
      renderTable();
    });

    dom.addSongBtn.addEventListener("click", openAddModal);
  }

  /* ---------------------------------------------------------------------
     Add / Edit modal
     --------------------------------------------------------------------- */
  function bindSongModal() {
    dom.songModalCloseBtn.addEventListener("click", closeSongModal);
    dom.songCancelBtn.addEventListener("click", closeSongModal);
    dom.songModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.songModalOverlay) closeSongModal();
    });

    dom.chooseAudioBtn.addEventListener("click", function () { dom.audioFileInput.click(); });
    dom.audioFileInput.addEventListener("change", function () {
      const file = dom.audioFileInput.files && dom.audioFileInput.files[0];
      handleAudioFile(file);
    });

    ["dragover", "dragenter"].forEach(function (evtName) {
      dom.uploadDropzone.addEventListener(evtName, function (evt) {
        evt.preventDefault();
        dom.uploadDropzone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach(function (evtName) {
      dom.uploadDropzone.addEventListener(evtName, function (evt) {
        evt.preventDefault();
        dom.uploadDropzone.classList.remove("drag-over");
      });
    });
    dom.uploadDropzone.addEventListener("drop", function (evt) {
      const file = evt.dataTransfer.files && evt.dataTransfer.files[0];
      if (file) handleAudioFile(file);
    });

    dom.songForm.addEventListener("submit", handleSongFormSubmit);
  }

  async function handleAudioFile(file) {
    clearFieldError("audio");
    if (!file) return;

    if (!window.IraivaSongsAdmin.isValidAudioFile(file)) {
      setFieldError("audio", "Only MP3, WAV, OGG or M4A audio files are supported.");
      dom.audioFileInput.value = "";
      return;
    }

    try {
      const dataUrl = await window.IraivaSongsAdmin.readFileAsDataUrl(file);
      pendingAudioDataUrl = dataUrl;
      dom.uploadPreview.classList.add("has-file");
      dom.uploadPreview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      dom.uploadFilename.textContent = file.name;
    } catch (err) {
      setFieldError("audio", "Could not read that audio file. Please try another file.");
    }
  }

  function resetSongForm() {
    dom.songForm.reset();
    pendingAudioDataUrl = null;
    dom.uploadPreview.classList.remove("has-file");
    dom.uploadPreview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
    dom.uploadFilename.textContent = "MP3, WAV, OGG or M4A";
    dom.audioFileInput.value = "";
    ["title", "albumId", "language", "trackNumber", "audio"].forEach(clearFieldError);
    [dom.fieldTitle, dom.fieldAlbum, dom.fieldLanguage, dom.fieldNumber].forEach(function (el) {
      el.classList.remove("invalid");
    });
  }

  function openAddModal() {
    editingId = null;
    resetSongForm();
    dom.songModalTitle.textContent = "Add New Song";
    dom.fieldPublished.checked = true;
    if (dom.editLyricsSyncLink) dom.editLyricsSyncLink.style.display = "none";
    openModal(dom.songModalOverlay);
    dom.fieldTitle.focus();
  }

  function openEditModal(id) {
    const song = allSongs.find(function (s) { return s.id === id; });
    if (!song) return;

    editingId = id;
    resetSongForm();
    dom.songModalTitle.textContent = "Edit Song";

    dom.fieldTitle.value = song.title || "";
    dom.fieldAlbum.value = song.albumId || "";
    dom.fieldLanguage.value = song.language || "";
    dom.fieldNumber.value = song.trackNumber || "";
    dom.fieldLyricsPreview.value = song.lyricsPreview || "";
    dom.fieldLyrics.value = window.IraivaSongsAdmin.lyricsToLines(song.lyrics);
    dom.fieldPublished.checked = !!song.isPublished;

    if (song.audioFile) {
      dom.uploadPreview.classList.add("has-file");
      dom.uploadPreview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
      dom.uploadFilename.textContent = "Current audio file — choose a new file to replace it";
    }

    ensureEditLyricsSyncLink();
    editLyricsSyncTargetId = id;
    dom.editLyricsSyncLink.style.display = "inline-block";
    dom.editLyricsSyncLink.disabled = !song.audioFile;
    dom.editLyricsSyncLink.title = song.audioFile ? "" : "Upload an MP3 for this song first";

    openModal(dom.songModalOverlay);
    dom.fieldTitle.focus();
  }

  /* Entry point for the synced-lyrics feature, visible inside the Edit
     Song modal next to the plain lyrics textarea. Actual LRC import /
     manual sync editing stays inside the existing Manage Lyrics modal
     (see ensureLyricsSyncToolbar / openLyricsModal below) rather than
     duplicating it here — the Edit Song form's Save button always
     regenerates lyrics timing from the plain textarea via
     linesToLyrics(), so running the sync tools from inside this modal
     and then pressing "Save Song" would silently overwrite the just-set
     timestamps. Routing through Manage Lyrics (whose own Save only ever
     touches the lyrics field) avoids that risk entirely. */
  let editLyricsSyncTargetId = null;

  function ensureEditLyricsSyncLink() {
    if (dom.editLyricsSyncLink) return;

    const link = document.createElement("button");
    link.type = "button";
    link.className = "btn";
    link.style.cssText = "margin-bottom:8px;";
    link.textContent = "Import LRC / Sync Lyrics with Playback…";

    link.addEventListener("click", function () {
      if (!editLyricsSyncTargetId) return;
      const id = editLyricsSyncTargetId;
      closeSongModal();
      openLyricsModal(id);
    });

    dom.fieldLyrics.parentNode.insertBefore(link, dom.fieldLyrics);
    dom.editLyricsSyncLink = link;
  }

  function closeSongModal() {
    closeModal(dom.songModalOverlay);
    editingId = null;
    pendingAudioDataUrl = null;
    editLyricsSyncTargetId = null;
  }

  function clearFieldError(key) {
    const el = document.getElementById("err-" + key);
    if (el) el.textContent = "";
  }
  function setFieldError(key, message) {
    const el = document.getElementById("err-" + key);
    if (el) el.textContent = message;
  }

  async function handleSongFormSubmit(evt) {
    evt.preventDefault();

    const input = {
      title: dom.fieldTitle.value,
      albumId: dom.fieldAlbum.value,
      language: dom.fieldLanguage.value,
      trackNumber: dom.fieldNumber.value,
      lyricsPreview: dom.fieldLyricsPreview.value,
      lyrics: dom.fieldLyrics.value,
      isPublished: dom.fieldPublished.checked
    };

    if (pendingAudioDataUrl) {
      input.audioFile = pendingAudioDataUrl;
    } else if (editingId) {
      const existing = allSongs.find(function (s) { return s.id === editingId; });
      input.audioFile = existing ? existing.audioFile : "";
    } else {
      input.audioFile = "";
    }

    ["title", "albumId", "language", "trackNumber"].forEach(clearFieldError);

    dom.songSaveBtn.disabled = true;
    try {
      if (editingId) {
        await window.IraivaSongsAdmin.updateSong(editingId, input);
        showToast("success", "Song updated successfully.");
      } else {
        await window.IraivaSongsAdmin.createSong(input);
        showToast("success", "Song added successfully.");
      }
      closeSongModal();
      await loadAndRender();
    } catch (err) {
      if (err && err.fieldErrors) {
        Object.keys(err.fieldErrors).forEach(function (key) {
          setFieldError(key, err.fieldErrors[key]);
          const fieldEl = document.getElementById(
            key === "title" ? "songTitle" :
            key === "albumId" ? "songAlbum" :
            key === "language" ? "songLanguage" :
            key === "trackNumber" ? "songNumber" : null
          );
          if (fieldEl) fieldEl.classList.add("invalid");
        });
      } else {
        showToast("error", "Something went wrong saving this song. Please try again.");
      }
    } finally {
      dom.songSaveBtn.disabled = false;
    }
  }

  /* ---------------------------------------------------------------------
     View modal
     --------------------------------------------------------------------- */
  function bindViewModal() {
    dom.viewModalCloseBtn.addEventListener("click", closeViewModal);
    dom.viewCloseBtn.addEventListener("click", closeViewModal);
    dom.viewModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.viewModalOverlay) closeViewModal();
    });
    dom.viewEditBtn.addEventListener("click", function () {
      const id = viewingId;
      closeViewModal();
      if (id) openEditModal(id);
    });
  }

  function openViewModal(id) {
    const song = allSongs.find(function (s) { return s.id === id; });
    if (!song) return;
    viewingId = id;

    const lyricsText = window.IraivaSongsAdmin.lyricsToLines(song.lyrics);
    const publishedPill = song.isPublished
      ? '<span class="mini-pill on"><span class="dot"></span>Published</span>'
      : '<span class="mini-pill off"><span class="dot"></span>Unpublished</span>';

    dom.viewModalBody.innerHTML =
      '<div class="view-detail-grid">' +
        '<div class="view-detail-item"><span class="view-detail-label">Album</span><span class="view-detail-value">' + escapeHtml(song._albumName) + "</span></div>" +
        '<div class="view-detail-item"><span class="view-detail-label">Language</span><span class="view-detail-value">' + escapeHtml(song.language) + "</span></div>" +
        '<div class="view-detail-item"><span class="view-detail-label">Song Number</span><span class="view-detail-value">' + (song.trackNumber || "—") + "</span></div>" +
        '<div class="view-detail-item"><span class="view-detail-label">Status</span><span class="view-detail-value">' + publishedPill + "</span></div>" +
        '<div class="view-detail-item span-2"><span class="view-detail-label">Documents</span><div class="view-docs-row">' + docPills(song.documents) + "</div></div>" +
      "</div>" +
      '<div class="view-detail-item">' +
        '<span class="view-detail-label">Lyrics</span>' +
        '<div class="view-lyrics-block' + (lyricsText ? "" : " empty") + '">' +
          (lyricsText ? escapeHtml(lyricsText) : "No lyrics added yet.") +
        "</div>" +
      "</div>";

    document.getElementById("viewModalTitle").textContent = song.title;
    openModal(dom.viewModalOverlay);
  }

  function closeViewModal() {
    closeModal(dom.viewModalOverlay);
    viewingId = null;
  }

  /* ---------------------------------------------------------------------
     Delete modal
     --------------------------------------------------------------------- */
  function bindDeleteModal() {
    dom.deleteModalCloseBtn.addEventListener("click", closeDeleteModal);
    dom.deleteCancelBtn.addEventListener("click", closeDeleteModal);
    dom.deleteModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.deleteModalOverlay) closeDeleteModal();
    });
    dom.deleteConfirmBtn.addEventListener("click", confirmDelete);
  }

  function openDeleteModal(id) {
    const song = allSongs.find(function (s) { return s.id === id; });
    if (!song) return;
    deleteTargetId = id;
    dom.deleteSongName.textContent = song.title;
    openModal(dom.deleteModalOverlay);
  }

  function closeDeleteModal() {
    closeModal(dom.deleteModalOverlay);
    deleteTargetId = null;
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    dom.deleteConfirmBtn.disabled = true;
    try {
      await window.IraivaSongsAdmin.deleteSong(deleteTargetId);
      showToast("success", "Song deleted.");
      closeDeleteModal();
      await loadAndRender();
    } catch (err) {
      showToast("error", "Could not delete this song. Please try again.");
    } finally {
      dom.deleteConfirmBtn.disabled = false;
    }
  }

  /* ---------------------------------------------------------------------
     STEP 4B-3 — Manage Documents modal (Word / PDF / PPT per song)
     --------------------------------------------------------------------- */
  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function docRowIconSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>';
  }

  function renderDocRow(type, entry) {
    const label = window.IraivaSongsAdmin.DOC_LABELS[type];
    const accept = type === "word" ? ".docx" : type === "pdf" ? ".pdf" : ".pptx";
    const hasFile = !!entry;
    const isUploaded = window.IraivaSongsAdmin.isUploadedDocument(entry);

    let meta;
    if (!hasFile) {
      meta = '<span class="doc-row-empty">No file uploaded for this format yet.</span>';
    } else if (isUploaded) {
      meta = '<span class="doc-row-filename">' + escapeHtml(entry.fileName || accept) + "</span>" +
        '<span class="doc-row-sub">' + accept.replace(".", "").toUpperCase() + " · " + formatFileSize(entry.fileSize) + "</span>";
    } else {
      meta = '<span class="doc-row-filename">' + escapeHtml(String(entry)) + "</span>" +
        '<span class="doc-row-sub">Linked asset path</span>';
    }

    const statusPill = hasFile
      ? '<span class="mini-pill on"><span class="dot"></span>Available</span>'
      : '<span class="mini-pill off"><span class="dot"></span>Not Uploaded</span>';

    return (
      '<div class="doc-manage-row" data-doc-type="' + type + '">' +
        '<div class="doc-row-icon">' + docRowIconSvg() + "</div>" +
        '<div class="doc-row-body">' +
          '<div class="doc-row-head"><strong>' + escapeHtml(label) + " Document</strong>" + statusPill + "</div>" +
          '<div class="doc-row-meta">' + meta + "</div>" +
          '<span class="field-error" id="err-doc-' + type + '"></span>' +
        "</div>" +
        '<div class="doc-row-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-doc-upload="' + type + '">' + (hasFile ? "Change" : "Upload") + "</button>" +
          (isUploaded ? '<a class="btn btn-outline btn-sm" data-doc-download="' + type + '" download="' + escapeHtml(entry.fileName || "") + '" href="' + entry.dataUrl + '">Download</a>' : "") +
          (hasFile ? '<button type="button" class="btn btn-icon danger" data-doc-remove="' + type + '" aria-label="Remove ' + escapeHtml(label) + ' document" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>' : "") +
          '<input type="file" class="doc-file-input" data-doc-input="' + type + '" accept="' + accept + '" hidden>' +
        "</div>" +
      "</div>"
    );
  }

  async function renderDocumentsModalBody() {
    if (!docsSongId) return;
    const song = allSongs.find(function (s) { return s.id === docsSongId; });
    if (!song) return;

    dom.docsSongTitle.textContent = song.title;
    dom.docsSongAlbum.textContent = song._albumName;
    dom.docsSongLanguage.textContent = song.language;

    const docs = await window.IraivaSongsAdmin.getSongDocuments(docsSongId);
    dom.docRowsWrap.innerHTML = window.IraivaSongsAdmin.DOC_TYPES.map(function (type) {
      return renderDocRow(type, docs[type]);
    }).join("");

    bindDocRowActions();
  }

  function bindDocRowActions() {
    dom.docRowsWrap.querySelectorAll("[data-doc-upload]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const type = btn.getAttribute("data-doc-upload");
        const input = dom.docRowsWrap.querySelector('[data-doc-input="' + type + '"]');
        if (input) input.click();
      });
    });
    dom.docRowsWrap.querySelectorAll("[data-doc-input]").forEach(function (input) {
      input.addEventListener("change", function () {
        const type = input.getAttribute("data-doc-input");
        const file = input.files && input.files[0];
        if (file) handleDocumentUpload(type, file);
        input.value = "";
      });
    });
    dom.docRowsWrap.querySelectorAll("[data-doc-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteDocModal(docsSongId, btn.getAttribute("data-doc-remove"));
      });
    });
  }

  async function handleDocumentUpload(type, file) {
    const errEl = document.getElementById("err-doc-" + type);
    if (errEl) errEl.textContent = "";
    try {
      await window.IraivaSongsAdmin.saveSongDocument(docsSongId, type, file);
      showToast("success", window.IraivaSongsAdmin.DOC_LABELS[type] + " document uploaded.");
      await loadAndRender();
      await renderDocumentsModalBody();
    } catch (err) {
      if (errEl) errEl.textContent = (err && err.message) || "Could not upload that file.";
      showToast("error", (err && err.message) || "Could not upload that file.");
    }
  }

  function openDocumentsModal(id) {
    const song = allSongs.find(function (s) { return s.id === id; });
    if (!song) return;
    docsSongId = id;
    renderDocumentsModalBody();
    openModal(dom.documentsModalOverlay);
  }

  function closeDocumentsModal() {
    closeModal(dom.documentsModalOverlay);
    docsSongId = null;
  }

  function bindDocumentsModal() {
    dom.documentsModalCloseBtn.addEventListener("click", closeDocumentsModal);
    dom.documentsDoneBtn.addEventListener("click", closeDocumentsModal);
    dom.documentsModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.documentsModalOverlay) closeDocumentsModal();
    });

    dom.deleteDocModalCloseBtn.addEventListener("click", closeDeleteDocModal);
    dom.deleteDocCancelBtn.addEventListener("click", closeDeleteDocModal);
    dom.deleteDocModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.deleteDocModalOverlay) closeDeleteDocModal();
    });
    dom.deleteDocConfirmBtn.addEventListener("click", confirmDeleteDoc);
  }

  function openDeleteDocModal(songId, type) {
    deleteDocTarget = { songId: songId, type: type };
    dom.deleteDocLabel.textContent = window.IraivaSongsAdmin.DOC_LABELS[type] + " document";
    openModal(dom.deleteDocModalOverlay);
  }

  function closeDeleteDocModal() {
    closeModal(dom.deleteDocModalOverlay);
    deleteDocTarget = null;
  }

  async function confirmDeleteDoc() {
    if (!deleteDocTarget) return;
    dom.deleteDocConfirmBtn.disabled = true;
    try {
      await window.IraivaSongsAdmin.deleteSongDocument(deleteDocTarget.songId, deleteDocTarget.type);
      showToast("success", "Document removed.");
      closeDeleteDocModal();
      await loadAndRender();
      await renderDocumentsModalBody();
    } catch (err) {
      showToast("error", "Could not remove this document. Please try again.");
    } finally {
      dom.deleteDocConfirmBtn.disabled = false;
    }
  }

  /* ---------------------------------------------------------------------
     Manage Lyrics modal (STEP 4B-4)
     Talks only to window.IraivaSongsAdmin.getLyrics/saveLyrics — plain
     multi-line textarea, no synchronization editor.
     --------------------------------------------------------------------- */
  async function openLyricsModal(id) {
    const song = allSongs.find(function (s) { return s.id === id; });
    if (!song) return;
    lyricsSongId = id;

    dom.lyricsSongTitle.textContent = song.title;
    dom.lyricsSongAlbum.textContent = song._albumName;
    dom.lyricsSongLanguage.textContent = song.language;
    dom.lyricsTextarea.value = await window.IraivaSongsAdmin.getLyrics(id);

    ensureLyricsSyncToolbar();
    dom.lyricsSyncBtn.disabled = !song.audioFile;
    dom.lyricsSyncBtn.title = song.audioFile ? "" : "Upload an MP3 for this song first";

    openModal(dom.lyricsModalOverlay);
  }

  function closeLyricsModal() {
    closeModal(dom.lyricsModalOverlay);
    lyricsSongId = null;
  }

  async function saveLyricsFromModal() {
    if (!lyricsSongId) return;
    dom.lyricsSaveBtn.disabled = true;
    try {
      await window.IraivaSongsAdmin.saveLyrics(lyricsSongId, dom.lyricsTextarea.value);
      showToast("success", "Lyrics saved.");
      await loadAndRender();
      closeLyricsModal();
    } catch (err) {
      showToast("error", (err && err.message) || "Could not save lyrics. Please try again.");
    } finally {
      dom.lyricsSaveBtn.disabled = false;
    }
  }

  async function clearLyricsFromModal() {
    if (!lyricsSongId) return;
    dom.lyricsClearBtn.disabled = true;
    try {
      await window.IraivaSongsAdmin.saveLyrics(lyricsSongId, "");
      dom.lyricsTextarea.value = "";
      showToast("success", "Lyrics cleared.");
      await loadAndRender();
    } catch (err) {
      showToast("error", (err && err.message) || "Could not clear lyrics. Please try again.");
    } finally {
      dom.lyricsClearBtn.disabled = false;
    }
  }

  function bindLyricsModal() {
    dom.lyricsModalCloseBtn.addEventListener("click", closeLyricsModal);
    dom.lyricsModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.lyricsModalOverlay) closeLyricsModal();
    });
    dom.lyricsSaveBtn.addEventListener("click", saveLyricsFromModal);
    dom.lyricsClearBtn.addEventListener("click", clearLyricsFromModal);
  }

  /* ---------------------------------------------------------------------
     Synced Lyrics: LRC import + manual Sync Editor (new feature, additive)
     No existing markup covers this, so the toolbar and editor are built
     here in JS and attached to the existing Lyrics modal / document.body.
     Both paths only ever write via IraivaSongsAdmin.importLyricsFromLRC /
     saveSyncedLyrics — same isolation as the rest of this file.
     --------------------------------------------------------------------- */
  let lyricsSyncSongId = null;
  let syncEditorEls = null;

  /* ---- Readability fix, scoped to this modal only (additive) ----
     The modal has a white background, but several elements were
     inheriting the dashboard's light-on-dark text color, making them
     nearly invisible. This only ever sets an inline `color` (with
     !important, since inline color alone was already being overridden)
     on the specific elements this file creates below -- no class name,
     ID, or existing .btn/button rule is touched, and nothing outside
     this modal is affected. Used for the three buttons whose visible
     enabled/disabled state matters (Undo, -0.5s, +0.5s). */
  function setSyncCtrlBtnState(btn, disabled) {
    btn.disabled = disabled;
    btn.style.setProperty("color", disabled ? "#999999" : "#1a1a1a", "important");
    btn.style.opacity = disabled ? "0.6" : "1";
    btn.style.cursor = disabled ? "not-allowed" : "pointer";
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file);
    });
  }

  function ensureLyricsSyncToolbar() {
    if (dom.lyricsSyncToolbar) return;

    const toolbar = document.createElement("div");
    toolbar.style.cssText = "display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;";

    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.className = "btn";
    importBtn.textContent = "Import LRC File";

    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = ".lrc,.txt";
    importInput.style.display = "none";

    const syncBtn = document.createElement("button");
    syncBtn.type = "button";
    syncBtn.className = "btn";
    syncBtn.textContent = "Sync with Playback";

    importBtn.addEventListener("click", function () { importInput.click(); });
    importInput.addEventListener("change", async function () {
      const file = importInput.files && importInput.files[0];
      importInput.value = "";
      if (!file || !lyricsSongId) return;
      try {
        const text = await readFileAsText(file);
        const saved = await window.IraivaSongsAdmin.importLyricsFromLRC(lyricsSongId, text);
        dom.lyricsTextarea.value = window.IraivaSongsAdmin.lyricsToLines(saved);
        showToast("success", "Imported " + saved.length + " synced lyric lines.");
        await loadAndRender();
      } catch (err) {
        showToast("error", (err && err.message) || "Could not import that LRC file.");
      }
    });

    syncBtn.addEventListener("click", function () {
      if (lyricsSongId) openSyncEditor(lyricsSongId);
    });

    toolbar.appendChild(importBtn);
    toolbar.appendChild(syncBtn);
    toolbar.appendChild(importInput);

    dom.lyricsTextarea.parentNode.insertBefore(toolbar, dom.lyricsTextarea);
    dom.lyricsSyncToolbar = toolbar;
    dom.lyricsSyncBtn = syncBtn;
  }

  function buildSyncEditorModal() {
    if (syncEditorEls) return syncEditorEls;

    const overlay = document.createElement("div");
    overlay.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;padding:20px;";

    const panel = document.createElement("div");
    panel.style.cssText = "background:#fff;border-radius:10px;max-width:560px;width:100%;max-height:85vh;overflow:auto;padding:20px;";

    const title = document.createElement("h3");
    title.style.cssText = "margin:0 0 12px;color:#1a1a1a !important;";
    title.textContent = "Sync Lyrics with Playback";

    const hint = document.createElement("p");
    hint.style.cssText = "margin:0 0 6px;color:#666 !important;font-size:13px;";
    hint.textContent = "Play the song and tap \"Set Time\" on each line at the moment it should appear.";

    /* ---- Quick Sync Mode (additive, new feature) ----
       A second, faster way to time lines: turn it on, press play, and tap
       SPACEBAR at the moment each line (in order) should appear. This does
       not replace "Set Time" — both write into the exact same rowState
       entries and go through the exact same saveSyncEditor() save path. */
    const quickSyncHint = document.createElement("p");
    quickSyncHint.style.cssText = "margin:0 0 14px;color:#666 !important;font-size:13px;";
    quickSyncHint.textContent = "Quick Sync Mode: turn it on, play the song, and press SPACEBAR at the moment each line (in order) should appear.";

    const audio = document.createElement("audio");
    audio.style.display = "none";

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;";

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "btn";
    playBtn.textContent = "Play";
    playBtn.style.cssText = "color:#1a1a1a !important;";

    const timeLabel = document.createElement("span");
    timeLabel.textContent = "0:00";
    timeLabel.style.cssText = "font-variant-numeric:tabular-nums;color:#1a1a1a !important;";

    const quickSyncBtn = document.createElement("button");
    quickSyncBtn.type = "button";
    quickSyncBtn.className = "btn";
    quickSyncBtn.textContent = "Quick Sync Mode: Off";
    // Dark text while Off (a plain .btn); when toggled On it also gets
    // .btn-primary (like Save Sync), so the color override is removed
    // there to let the existing primary-button styling show through.
    quickSyncBtn.style.setProperty("color", "#1a1a1a", "important");

    controls.appendChild(playBtn);
    controls.appendChild(timeLabel);
    controls.appendChild(quickSyncBtn);

    const adjustControls = document.createElement("div");
    adjustControls.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;";

    const selectedLabel = document.createElement("span");
    selectedLabel.textContent = "No line selected";
    selectedLabel.style.cssText = "font-size:12px;color:#666 !important;flex:1;min-width:120px;";

    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "btn";
    undoBtn.textContent = "Undo Last Timestamp";
    setSyncCtrlBtnState(undoBtn, true);

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "btn";
    minusBtn.textContent = "-0.5s";
    setSyncCtrlBtnState(minusBtn, true);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "btn";
    plusBtn.textContent = "+0.5s";
    setSyncCtrlBtnState(plusBtn, true);

    adjustControls.appendChild(selectedLabel);
    adjustControls.appendChild(undoBtn);
    adjustControls.appendChild(minusBtn);
    adjustControls.appendChild(plusBtn);

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:6px;max-height:45vh;overflow:auto;border:1px solid #e2e2e2;border-radius:8px;padding:8px;";

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:14px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "color:#1a1a1a !important;";

    /* ---- Clear Saved Timestamps (data cleanup, additive) ----
       A song's existing saved lyrics may already carry bad/demo
       timestamps (e.g. 0, 6, 12, 18 ...) written before manual timing
       existed. This is the safe, explicit way to reset ONLY those
       timestamps back to unsynced ("--:--") without touching lyrics
       text, title, album, audio, images, documents, or any other song. */
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "btn";
    clearBtn.textContent = "Clear Saved Timestamps";
    clearBtn.style.cssText = "color:#1a1a1a !important;";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "Save Sync";

    actions.appendChild(clearBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(quickSyncHint);
    panel.appendChild(audio);
    panel.appendChild(controls);
    panel.appendChild(adjustControls);
    panel.appendChild(list);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (evt) { if (evt.target === overlay) closeSyncEditor(); });
    playBtn.addEventListener("click", function () {
      if (audio.paused) audio.play(); else audio.pause();
    });
    audio.addEventListener("play", function () { playBtn.textContent = "Pause"; });
    audio.addEventListener("pause", function () { playBtn.textContent = "Play"; });
    audio.addEventListener("timeupdate", function () { timeLabel.textContent = formatTime(audio.currentTime); });
    cancelBtn.addEventListener("click", closeSyncEditor);
    saveBtn.addEventListener("click", saveSyncEditor);
    clearBtn.addEventListener("click", clearSavedTimestamps);

    quickSyncBtn.addEventListener("click", function () { toggleQuickSyncMode(); });
    undoBtn.addEventListener("click", function () { undoLastTimestamp(); });
    minusBtn.addEventListener("click", function () { nudgeSelectedLine(-0.5); });
    plusBtn.addEventListener("click", function () { nudgeSelectedLine(0.5); });

    syncEditorEls = {
      overlay: overlay, audio: audio, playBtn: playBtn, timeLabel: timeLabel, list: list, saveBtn: saveBtn,
      quickSyncBtn: quickSyncBtn, undoBtn: undoBtn, minusBtn: minusBtn, plusBtn: plusBtn, selectedLabel: selectedLabel,
      clearBtn: clearBtn
    };
    return syncEditorEls;
  }

  /* ---- Quick Sync Mode: state + helpers (additive) ----
     rowState (built in openSyncEditor) is the single source of truth for
     line timings, exactly as before. Quick Sync only adds a pointer to
     "the next line to capture", a small undo history, and a "selected
     line" used for click-to-seek and the +/-0.5s nudge buttons. None of
     this changes what gets saved: saveSyncEditor() still just reads
     rowState the same way it always did. */

  function getRowState() {
    return (syncEditorEls && syncEditorEls.overlay && syncEditorEls.overlay._rowState) || [];
  }

  function getRowEls() {
    return (syncEditorEls && syncEditorEls.overlay && syncEditorEls.overlay._rowEls) || [];
  }

  function getQuickSyncState() {
    return syncEditorEls && syncEditorEls.overlay && syncEditorEls.overlay._quickSync;
  }

  function findNextUnsetIndex(rowState, fromIndex) {
    for (let i = Math.max(0, fromIndex || 0); i < rowState.length; i++) {
      if (rowState[i].time === null) return i;
    }
    for (let i = 0; i < rowState.length; i++) {
      if (rowState[i].time === null) return i;
    }
    return -1;
  }

  function updateRowDisplay(idx) {
    const rowState = getRowState();
    const rowEls = getRowEls();
    const entry = rowEls[idx];
    const data = rowState[idx];
    if (!entry || !data) return;
    entry.timeEl.textContent = data.time === null ? "--:--" : formatTime(data.time);
  }

  function refreshRowHighlights() {
    const rowEls = getRowEls();
    const qs = getQuickSyncState();
    const selectedIndex = qs ? qs.selectedIndex : -1;
    rowEls.forEach(function (entry, i) {
      const isSelected = i === selectedIndex;
      entry.row.style.background = isSelected ? "#eef4ff" : "";
      entry.row.style.borderColor = isSelected ? "#7aa7ff" : "transparent";
    });
  }

  function selectLine(idx, opts) {
    const qs = getQuickSyncState();
    const rowState = getRowState();
    if (!qs || idx == null || idx < 0 || idx >= rowState.length) return;
    qs.selectedIndex = idx;
    refreshRowHighlights();

    const hasTime = rowState[idx].time !== null;
    if (syncEditorEls) {
      setSyncCtrlBtnState(syncEditorEls.minusBtn, !hasTime);
      setSyncCtrlBtnState(syncEditorEls.plusBtn, !hasTime);
      syncEditorEls.selectedLabel.textContent = "Selected: \"" + rowState[idx].text.slice(0, 40) +
        (rowState[idx].text.length > 40 ? "…" : "") + "\"";
    }

    if (opts && opts.seek && hasTime && syncEditorEls) {
      syncEditorEls.audio.currentTime = rowState[idx].time;
    }
  }

  function setLineTime(idx, time, opts) {
    const rowState = getRowState();
    const qs = getQuickSyncState();
    if (!rowState[idx] || !qs) return;

    const prevTime = rowState[idx].time;
    rowState[idx].time = time;
    qs.history.push({ index: idx, prevTime: prevTime });
    updateRowDisplay(idx);

    if (!opts || opts.select !== false) {
      selectLine(idx);
    }

    if (syncEditorEls) setSyncCtrlBtnState(syncEditorEls.undoBtn, qs.history.length === 0);
  }

  function toggleQuickSyncMode() {
    const qs = getQuickSyncState();
    if (!qs || !syncEditorEls) return;
    qs.active = !qs.active;
    syncEditorEls.quickSyncBtn.textContent = "Quick Sync Mode: " + (qs.active ? "On" : "Off");
    syncEditorEls.quickSyncBtn.classList.toggle("btn-primary", qs.active);
    // On: let the existing .btn-primary styling (same as Save Sync) show
    // through. Off: it's back to a plain .btn, so re-apply the dark-text
    // override.
    if (qs.active) {
      syncEditorEls.quickSyncBtn.style.removeProperty("color");
    } else {
      syncEditorEls.quickSyncBtn.style.setProperty("color", "#1a1a1a", "important");
    }

    if (qs.active) {
      const rowState = getRowState();
      const next = findNextUnsetIndex(rowState, 0);
      qs.nextIndex = next === -1 ? rowState.length : next;
      if (next !== -1) selectLine(next);
    }
  }

  function captureNextLineFromSpacebar() {
    const qs = getQuickSyncState();
    const rowState = getRowState();
    if (!qs || !qs.active || !syncEditorEls) return;
    if (syncEditorEls.audio.paused) return; // requirement: only while playing

    let idx = qs.nextIndex;
    if (idx == null || idx < 0 || idx >= rowState.length || rowState[idx].time !== null) {
      idx = findNextUnsetIndex(rowState, 0);
      if (idx === -1) return; // every line already has a timestamp
    }

    setLineTime(idx, syncEditorEls.audio.currentTime || 0, { select: false });

    // Auto-advance to the next unset line (requirement 4).
    let next = idx + 1;
    while (next < rowState.length && rowState[next].time !== null) next++;
    if (next >= rowState.length) next = findNextUnsetIndex(rowState, 0);
    qs.nextIndex = next === -1 ? rowState.length : next;
    selectLine(next === -1 ? idx : next);
  }

  function undoLastTimestamp() {
    const qs = getQuickSyncState();
    const rowState = getRowState();
    if (!qs || !qs.history.length) return;
    const last = qs.history.pop();
    if (!rowState[last.index]) return;
    rowState[last.index].time = last.prevTime;
    updateRowDisplay(last.index);
    qs.nextIndex = last.index;
    selectLine(last.index);
    if (syncEditorEls) setSyncCtrlBtnState(syncEditorEls.undoBtn, qs.history.length === 0);
  }

  function nudgeSelectedLine(delta) {
    const qs = getQuickSyncState();
    const rowState = getRowState();
    if (!qs || qs.selectedIndex == null) return;
    const row = rowState[qs.selectedIndex];
    if (!row || row.time === null) return;
    row.time = Math.max(0, row.time + delta);
    updateRowDisplay(qs.selectedIndex);
  }

  function isQuickSyncSpaceEvent(evt) {
    if (!syncEditorEls || syncEditorEls.overlay.style.display !== "flex") return false;
    if (evt.code !== "Space" && evt.key !== " ") return false;
    const tag = evt.target && evt.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (evt.target && evt.target.isContentEditable)) return false;
    const qs = getQuickSyncState();
    return !!(qs && qs.active);
  }

  document.addEventListener("keydown", function (evt) {
    if (!isQuickSyncSpaceEvent(evt)) return;
    evt.preventDefault();
    captureNextLineFromSpacebar();
  });

  // A focused <button> (Play, the Quick Sync toggle, a row's Set Time
  // button, etc.) fires its own synthetic click from the Space key's
  // KEYUP, and that click is only suppressed if the keyup event itself
  // was prevented -- preventDefault() on keydown alone does not stop it.
  // Without this, whatever button happened to have focus was also
  // "clicked" right after every capture (e.g. re-toggling Quick Sync off,
  // or pausing playback), which is what made capture look unreliable.
  document.addEventListener("keyup", function (evt) {
    if (!isQuickSyncSpaceEvent(evt)) return;
    evt.preventDefault();
  });

  async function openSyncEditor(songId) {
    const song = allSongs.find(function (s) { return s.id === songId; });
    if (!song) return;
    if (!song.audioFile) {
      showToast("error", "Upload an MP3 for this song before syncing lyrics.");
      return;
    }

    const els = buildSyncEditorModal();
    lyricsSyncSongId = songId;

    const sourceText = dom.lyricsTextarea.value || window.IraivaSongsAdmin.lyricsToLines(song.lyrics) || "";
    const lines = sourceText.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l.length; });

    if (!lines.length) {
      showToast("error", "Add lyric lines in the textarea first, then sync their timing.");
      return;
    }

    els.list.innerHTML = "";
    els.list.onclick = null;

    // Root-cause fix: seed each row's time from the song's REAL saved
    // lyrics record (song.lyrics), not a blank slate. song.lyrics still
    // carries { time, text } exactly as persisted -- only the plain-text
    // textarea (lyricsToLines) strips time, and only for its own display.
    // Matched by text with position-aware consumption so repeated lines
    // (e.g. a repeated chorus) each keep their own saved time instead of
    // all collapsing onto the first match.
    const savedTimesByText = {};
    if (Array.isArray(song.lyrics)) {
      song.lyrics.forEach(function (l) {
        if (l && typeof l.time === "number" && l.text) {
          (savedTimesByText[l.text] = savedTimesByText[l.text] || []).push(l.time);
        }
      });
    }
    const rowState = lines.map(function (text) {
      const bucket = savedTimesByText[text];
      const time = (bucket && bucket.length) ? bucket.shift() : null;
      return { text: text, time: time };
    });
    const rowEls = [];

    rowState.forEach(function (item, idx) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;padding:4px 2px;border:1px solid transparent;border-radius:6px;cursor:pointer;";

      const markBtn = document.createElement("button");
      markBtn.type = "button";
      markBtn.className = "btn";
      markBtn.textContent = "Set Time";
      markBtn.style.cssText = "color:#1a1a1a !important;";

      const timeEl = document.createElement("span");
      timeEl.textContent = item.time === null ? "--:--" : formatTime(item.time);
      timeEl.style.cssText = "min-width:48px;font-variant-numeric:tabular-nums;color:#666 !important;";

      const textEl = document.createElement("span");
      textEl.textContent = item.text;
      textEl.style.cssText = "flex:1;color:#1a1a1a !important;";

      row.dataset.rowIndex = String(idx);
      markBtn.dataset.action = "set-time";

      row.appendChild(markBtn);
      row.appendChild(timeEl);
      row.appendChild(textEl);
      els.list.appendChild(row);
      rowEls.push({ row: row, timeEl: timeEl, textEl: textEl, markBtn: markBtn });
    });

    // Single delegated click handler for the whole list (replaces one
    // listener per row). More reliable than attaching a listener to each
    // row element individually: a "Set Time" click is identified by
    // data-action rather than relying on stopPropagation, and a click
    // anywhere else on a row (text, timestamp, empty space) selects it.
    els.list.onclick = function (evt) {
      const rowEl = evt.target.closest("[data-row-index]");
      if (!rowEl || !els.list.contains(rowEl)) return;
      const idx = Number(rowEl.dataset.rowIndex);

      const actionBtn = evt.target.closest("[data-action='set-time']");
      if (actionBtn) {
        setLineTime(idx, els.audio.currentTime || 0);
        return;
      }

      selectLine(idx, { seek: true });
    };

    els.audio.pause();
    els.audio.src = await window.IraivaSongsAdmin.resolveAudioSrc(song.audioFile);
    els.audio.currentTime = 0;
    els.timeLabel.textContent = "0:00";
    els.playBtn.textContent = "Play";
    els.overlay._rowState = rowState;
    els.overlay._rowEls = rowEls;
    els.overlay._quickSync = { active: false, nextIndex: 0, selectedIndex: null, history: [] };

    els.quickSyncBtn.textContent = "Quick Sync Mode: Off";
    els.quickSyncBtn.classList.remove("btn-primary");
    els.quickSyncBtn.style.setProperty("color", "#1a1a1a", "important");
    setSyncCtrlBtnState(els.undoBtn, true);
    setSyncCtrlBtnState(els.minusBtn, true);
    setSyncCtrlBtnState(els.plusBtn, true);
    els.selectedLabel.textContent = "No line selected";

    els.overlay.style.display = "flex";
    document.body.classList.add("scroll-lock");
  }

  function closeSyncEditor() {
    if (!syncEditorEls) return;
    syncEditorEls.audio.pause();
    syncEditorEls.audio.removeAttribute("src");
    syncEditorEls.audio.load();
    syncEditorEls.overlay.style.display = "none";
    syncEditorEls.overlay._quickSync = null;
    document.body.classList.remove("scroll-lock");
    lyricsSyncSongId = null;
  }

  async function saveSyncEditor() {
    if (!syncEditorEls || !lyricsSyncSongId) return;
    const rowState = syncEditorEls.overlay._rowState || [];

    syncEditorEls.saveBtn.disabled = true;
    try {
      const timed = rowState.map(function (r) { return { time: r.time, text: r.text }; });
      const saved = await window.IraivaSongsAdmin.saveSyncedLyrics(lyricsSyncSongId, timed);
      if (lyricsSongId === lyricsSyncSongId) {
        dom.lyricsTextarea.value = window.IraivaSongsAdmin.lyricsToLines(saved);
      }
      showToast("success", "Synced lyrics saved.");
      await loadAndRender();
      closeSyncEditor();
    } catch (err) {
      showToast("error", (err && err.message) || "Could not save synced lyrics.");
    } finally {
      syncEditorEls.saveBtn.disabled = false;
    }
  }

  /* Resets ONLY this song's saved timestamps (e.g. leftover bad/demo
     0, 6, 12, 18 ... values) back to unsynced. Lyrics text, order, and
     every other field are untouched -- see clearSyncTimestamps() in
     songs-data.js. Does not save by itself; it just clears what's
     already persisted and re-seeds the open editor so every row shows
     "--:--" again, ready for real manual timing. */
  async function clearSavedTimestamps() {
    if (!syncEditorEls || !lyricsSyncSongId) return;
    if (!window.confirm("Clear all saved timestamps for this song's lyrics? Lyrics text will not be affected.")) {
      return;
    }

    syncEditorEls.clearBtn.disabled = true;
    try {
      await window.IraivaSongsAdmin.clearSyncTimestamps(lyricsSyncSongId);

      const rowState = syncEditorEls.overlay._rowState || [];
      rowState.forEach(function (row, idx) {
        row.time = null;
        updateRowDisplay(idx);
      });

      const qs = syncEditorEls.overlay._quickSync;
      if (qs) {
        qs.active = false;
        qs.nextIndex = 0;
        qs.selectedIndex = null;
        qs.history = [];
      }
      syncEditorEls.quickSyncBtn.textContent = "Quick Sync Mode: Off";
      syncEditorEls.quickSyncBtn.classList.remove("btn-primary");
      syncEditorEls.quickSyncBtn.style.setProperty("color", "#1a1a1a", "important");
      setSyncCtrlBtnState(syncEditorEls.undoBtn, true);
      setSyncCtrlBtnState(syncEditorEls.minusBtn, true);
      setSyncCtrlBtnState(syncEditorEls.plusBtn, true);
      syncEditorEls.selectedLabel.textContent = "No line selected";
      refreshRowHighlights();

      await loadAndRender();
      showToast("success", "Saved timestamps cleared. Every line is unsynced (--:--).");
    } catch (err) {
      showToast("error", (err && err.message) || "Could not clear timestamps. Please try again.");
    } finally {
      syncEditorEls.clearBtn.disabled = false;
    }
  }

  document.addEventListener("keydown", function (evt) {
    if (evt.key === "Escape" && syncEditorEls && syncEditorEls.overlay.style.display === "flex") {
      closeSyncEditor();
    }
  });

  /* ---------------------------------------------------------------------
     Audio player modal
     --------------------------------------------------------------------- */
  function bindPlayerModal() {
    dom.playerModalCloseBtn.addEventListener("click", closePlayerModal);
    dom.playerModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.playerModalOverlay) closePlayerModal();
    });

    dom.playerPlayBtn.addEventListener("click", function () {
      if (dom.previewAudio.paused) dom.previewAudio.play();
      else dom.previewAudio.pause();
    });

    dom.previewAudio.addEventListener("play", function () {
      dom.playIcon.hidden = true;
      dom.pauseIcon.hidden = false;
    });
    dom.previewAudio.addEventListener("pause", function () {
      dom.playIcon.hidden = false;
      dom.pauseIcon.hidden = true;
    });
    dom.previewAudio.addEventListener("ended", function () {
      dom.playIcon.hidden = false;
      dom.pauseIcon.hidden = true;
      dom.playerProgress.value = 0;
    });
    dom.previewAudio.addEventListener("loadedmetadata", function () {
      dom.playerProgress.max = dom.previewAudio.duration || 0;
      dom.playerDuration.textContent = formatTime(dom.previewAudio.duration);
    });
    dom.previewAudio.addEventListener("timeupdate", function () {
      dom.playerProgress.value = dom.previewAudio.currentTime;
      dom.playerCurrentTime.textContent = formatTime(dom.previewAudio.currentTime);
    });
    dom.playerProgress.addEventListener("input", function () {
      dom.previewAudio.currentTime = Number(dom.playerProgress.value);
    });
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  async function openPlayerModal(id) {
    const song = allSongs.find(function (s) { return s.id === id; });
    if (!song || !song.audioFile) return;

    dom.playerSongTitle.textContent = song.title;
    dom.playerAlbumName.textContent = song._albumName;
    dom.previewAudio.src = await window.IraivaSongsAdmin.resolveAudioSrc(song.audioFile);
    dom.playerProgress.value = 0;
    dom.playerCurrentTime.textContent = "0:00";
    dom.playerDuration.textContent = "0:00";
    dom.playIcon.hidden = false;
    dom.pauseIcon.hidden = true;

    openModal(dom.playerModalOverlay);
  }

  function closePlayerModal() {
    dom.previewAudio.pause();
    dom.previewAudio.currentTime = 0;
    dom.previewAudio.removeAttribute("src");
    dom.previewAudio.load();
    closeModal(dom.playerModalOverlay);
  }

  /* ---------------------------------------------------------------------
     Modal open/close + escape key
     --------------------------------------------------------------------- */
  const allOverlays = function () {
    return [
      dom.songModalOverlay, dom.viewModalOverlay, dom.deleteModalOverlay, dom.playerModalOverlay,
      dom.documentsModalOverlay, dom.deleteDocModalOverlay, dom.lyricsModalOverlay
    ];
  };

  function openModal(overlay) {
    overlay.classList.add("open");
    document.body.classList.add("scroll-lock");
  }
  function closeModal(overlay) {
    overlay.classList.remove("open");
    const anyOpen = allOverlays().some(function (o) { return o && o.classList.contains("open"); });
    if (!anyOpen) document.body.classList.remove("scroll-lock");
  }
  document.addEventListener("keydown", function (evt) {
    if (evt.key !== "Escape") return;
    if (dom.deleteDocModalOverlay && dom.deleteDocModalOverlay.classList.contains("open")) closeDeleteDocModal();
    else if (dom.lyricsModalOverlay && dom.lyricsModalOverlay.classList.contains("open")) closeLyricsModal();
    else if (dom.documentsModalOverlay && dom.documentsModalOverlay.classList.contains("open")) closeDocumentsModal();
    else if (dom.deleteModalOverlay && dom.deleteModalOverlay.classList.contains("open")) closeDeleteModal();
    else if (dom.playerModalOverlay && dom.playerModalOverlay.classList.contains("open")) closePlayerModal();
    else if (dom.viewModalOverlay && dom.viewModalOverlay.classList.contains("open")) closeViewModal();
    else if (dom.songModalOverlay && dom.songModalOverlay.classList.contains("open")) closeSongModal();
  });

  /* ---------------------------------------------------------------------
     Toasts
     --------------------------------------------------------------------- */
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