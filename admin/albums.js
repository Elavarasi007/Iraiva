/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin/albums.js

   STEP 4B-1 SCOPE ONLY — ALBUM MANAGEMENT UI
   --------------------------------------------------------------------------
   Talks ONLY to window.IraivaAlbumsAdmin (admin/albums-data.js) for reads
   and writes. Never touches the public website's assets/js/data.js
   directly, and never reaches into localStorage itself — that stays fully
   inside the data layer so a backend can replace it later without any
   change here.
   ========================================================================== */

(function () {
  "use strict";

  const STATUS_LABEL = {
    "released": "Released",
    "coming-soon": "Coming Soon",
    "draft": "Draft"
  };

  let allAlbums = [];        // last loaded full set (with live song counts attached)
  let activeFilter = "all";
  let searchTerm = "";
  let editingId = null;      // null => Add mode
  let pendingCoverDataUrl = null; // set when a new file was chosen this session
  let deleteTargetId = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindToolbar();
    bindAlbumModal();
    bindDeleteModal();
    await loadAndRender();
  }

  /* ---------------------------------------------------------------------
     DOM references
     --------------------------------------------------------------------- */
  const dom = {};
  function cacheDom() {
    dom.grid = document.getElementById("albumsGrid");
    dom.searchInput = document.getElementById("albumSearchInput");
    dom.filterChips = document.getElementById("filterChips");
    dom.resultsMeta = document.getElementById("resultsMeta");
    dom.addAlbumBtn = document.getElementById("addAlbumBtn");

    dom.albumModalOverlay = document.getElementById("albumModalOverlay");
    dom.albumModalTitle = document.getElementById("albumModalTitle");
    dom.albumForm = document.getElementById("albumForm");
    dom.albumModalCloseBtn = document.getElementById("albumModalCloseBtn");
    dom.albumCancelBtn = document.getElementById("albumCancelBtn");
    dom.albumSaveBtn = document.getElementById("albumSaveBtn");

    dom.fieldName = document.getElementById("albumName");
    dom.fieldNumber = document.getElementById("albumNumber");
    dom.fieldYear = document.getElementById("albumYear");
    dom.fieldStatus = document.getElementById("albumStatus");
    dom.fieldSongCount = document.getElementById("albumSongCount");
    dom.fieldDescription = document.getElementById("albumDescription");
    dom.fieldPublished = document.getElementById("albumPublished");

    dom.coverFileInput = document.getElementById("coverFileInput");
    dom.chooseCoverBtn = document.getElementById("chooseCoverBtn");
    dom.uploadDropzone = document.getElementById("uploadDropzone");
    dom.uploadPreview = document.getElementById("uploadPreview");
    dom.uploadFilename = document.getElementById("uploadFilename");

    dom.deleteModalOverlay = document.getElementById("deleteModalOverlay");
    dom.deleteAlbumName = document.getElementById("deleteAlbumName");
    dom.deleteCancelBtn = document.getElementById("deleteCancelBtn");
    dom.deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
    dom.deleteModalCloseBtn = document.getElementById("deleteModalCloseBtn");

    dom.toastStack = document.getElementById("toastStack");
  }

  /* ---------------------------------------------------------------------
     Loading + rendering
     --------------------------------------------------------------------- */
  async function loadAndRender() {
    const [albums, liveCounts] = await Promise.all([
      window.IraivaAlbumsAdmin.getAll(),
      window.IraivaAlbumsAdmin.getLiveSongCounts()
    ]);

    allAlbums = albums.map(function (album) {
      const hasLive = Object.prototype.hasOwnProperty.call(liveCounts, album.id);
      return Object.assign({}, album, {
        _displayCount: hasLive ? liveCounts[album.id] : (album.songCount || 0)
      });
    });

    updateFilterCounts();
    renderGrid();
  }

  function updateFilterCounts() {
    const counts = {
      all: allAlbums.length,
      released: allAlbums.filter(a => a.status === "released").length,
      "coming-soon": allAlbums.filter(a => a.status === "coming-soon").length,
      draft: allAlbums.filter(a => a.status === "draft").length,
      published: allAlbums.filter(a => a.isPublished).length,
      unpublished: allAlbums.filter(a => !a.isPublished).length
    };
    Object.keys(counts).forEach(function (key) {
      const el = document.getElementById("count-" + key);
      if (el) el.textContent = counts[key];
    });
  }

  function matchesFilter(album) {
    switch (activeFilter) {
      case "released": return album.status === "released";
      case "coming-soon": return album.status === "coming-soon";
      case "draft": return album.status === "draft";
      case "published": return album.isPublished === true;
      case "unpublished": return album.isPublished === false;
      default: return true;
    }
  }

  function matchesSearch(album) {
    if (!searchTerm) return true;
    const haystack = (
      album.name + " " +
      (album.releaseYear || "") + " " +
      "album " + album.albumNumber
    ).toLowerCase();
    return haystack.indexOf(searchTerm) !== -1;
  }

  function getFilteredAlbums() {
    return allAlbums.filter(function (a) {
      return matchesFilter(a) && matchesSearch(a);
    });
  }

  function renderGrid() {
    const list = getFilteredAlbums();
    dom.resultsMeta.textContent = list.length + (list.length === 1 ? " album found" : " albums found");

    if (!list.length) {
      dom.grid.innerHTML =
        '<div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>' +
        "<strong>No albums found</strong>" +
        "<p>Try a different search term or filter, or add a new album.</p>" +
        "</div>";
      return;
    }

    dom.grid.innerHTML = list.map(renderCard).join("");

    // wire per-card actions
    dom.grid.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openEditModal(btn.getAttribute("data-edit")); });
    });
    dom.grid.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { openDeleteModal(btn.getAttribute("data-delete")); });
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderCard(album) {
    const cover = window.IraivaAlbumsAdmin.resolveCoverSrc(album.coverImage);
    const coverHtml = cover
      ? '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(album.name) + ' cover" loading="lazy">'
      : '<div class="no-cover"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg></div>';

    const statusPill = '<span class="pill status-' + album.status + '">' + STATUS_LABEL[album.status] + "</span>";
    const publishPill = album.isPublished
      ? '<span class="pill publish-published">Published</span>'
      : '<span class="pill publish-unpublished">Unpublished</span>';

    const yearText = album.releaseYear ? album.releaseYear : (album.status === "coming-soon" ? "TBA" : "—");
    const songLabel = album._displayCount === 1 ? "song" : "songs";

    return (
      '<div class="album-mgmt-card">' +
        '<div class="album-mgmt-cover">' +
          coverHtml +
          '<span class="album-mgmt-number">Album ' + album.albumNumber + "</span>" +
          '<div class="album-mgmt-badges">' + statusPill + publishPill + "</div>" +
        "</div>" +
        '<div class="album-mgmt-body">' +
          '<div class="album-mgmt-title">' + escapeHtml(album.name) + "</div>" +
          '<div class="album-mgmt-meta">' +
            "<span>" +
              '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>' +
              yearText +
            "</span>" +
            "<span>" +
              '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>' +
              album._displayCount + " " + songLabel +
            "</span>" +
          "</div>" +
          '<div class="album-mgmt-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-edit="' + album.id + '">Edit</button>' +
            '<button type="button" class="btn btn-icon danger" data-delete="' + album.id + '" aria-label="Delete ' + escapeHtml(album.name) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>' +
            "</button>" +
          "</div>" +
        "</div>" +
      "</div>"
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
        renderGrid();
      }, 150);
    });

    dom.filterChips.addEventListener("click", function (evt) {
      const chip = evt.target.closest(".filter-chip");
      if (!chip) return;
      dom.filterChips.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      activeFilter = chip.getAttribute("data-filter");
      renderGrid();
    });

    dom.addAlbumBtn.addEventListener("click", openAddModal);
  }

  /* ---------------------------------------------------------------------
     Add / Edit modal
     --------------------------------------------------------------------- */
  function bindAlbumModal() {
    dom.albumModalCloseBtn.addEventListener("click", closeAlbumModal);
    dom.albumCancelBtn.addEventListener("click", closeAlbumModal);
    dom.albumModalOverlay.addEventListener("click", function (evt) {
      if (evt.target === dom.albumModalOverlay) closeAlbumModal();
    });

    dom.chooseCoverBtn.addEventListener("click", function () { dom.coverFileInput.click(); });
    dom.coverFileInput.addEventListener("change", function () {
      const file = dom.coverFileInput.files && dom.coverFileInput.files[0];
      handleCoverFile(file);
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
      if (file) handleCoverFile(file);
    });

    dom.albumForm.addEventListener("submit", handleAlbumFormSubmit);
  }

  async function handleCoverFile(file) {
    clearFieldError("cover");
    if (!file) return;

    if (!window.IraivaAlbumsAdmin.isValidCoverFile(file)) {
      setFieldError("cover", "Only JPG, JPEG, PNG or WEBP images are supported.");
      dom.coverFileInput.value = "";
      return;
    }

    try {
      const dataUrl = await window.IraivaAlbumsAdmin.readFileAsDataUrl(file);
      pendingCoverDataUrl = dataUrl;
      dom.uploadPreview.innerHTML = '<img src="' + dataUrl + '" alt="Cover preview">';
      dom.uploadFilename.textContent = file.name;
    } catch (err) {
      setFieldError("cover", "Could not read that image. Please try another file.");
    }
  }

  function resetAlbumForm() {
    dom.albumForm.reset();
    dom.fieldStatus.value = "released";
    dom.fieldPublished.checked = true;
    pendingCoverDataUrl = null;
    dom.uploadPreview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>';
    dom.uploadFilename.textContent = "JPG, JPEG, PNG or WEBP";
    dom.coverFileInput.value = "";
    ["name", "albumNumber", "releaseYear", "status", "songCount", "cover"].forEach(clearFieldError);
    [dom.fieldName, dom.fieldNumber, dom.fieldYear, dom.fieldStatus, dom.fieldSongCount].forEach(function (el) {
      el.classList.remove("invalid");
    });
  }

  function openAddModal() {
    editingId = null;
    resetAlbumForm();
    dom.albumModalTitle.textContent = "Add Album";
    dom.fieldSongCount.value = 0;
    openModal(dom.albumModalOverlay);
    dom.fieldName.focus();
  }

  function openEditModal(id) {
    const album = allAlbums.find(function (a) { return a.id === id; });
    if (!album) return;

    editingId = id;
    resetAlbumForm();
    dom.albumModalTitle.textContent = "Edit Album";

    dom.fieldName.value = album.name || "";
    dom.fieldNumber.value = album.albumNumber || "";
    dom.fieldYear.value = album.releaseYear || "";
    dom.fieldStatus.value = album.status || "draft";
    dom.fieldSongCount.value = typeof album.songCount === "number" ? album.songCount : 0;
    dom.fieldDescription.value = album.description || "";
    dom.fieldPublished.checked = !!album.isPublished;

    const cover = window.IraivaAlbumsAdmin.resolveCoverSrc(album.coverImage);
    if (cover) {
      dom.uploadPreview.innerHTML = '<img src="' + cover + '" alt="Cover preview">';
      dom.uploadFilename.textContent = "Current cover — choose a new file to replace it";
    }

    openModal(dom.albumModalOverlay);
    dom.fieldName.focus();
  }

  function closeAlbumModal() {
    closeModal(dom.albumModalOverlay);
    editingId = null;
    pendingCoverDataUrl = null;
  }

  function clearFieldError(key) {
    const el = document.getElementById("err-" + key);
    if (el) el.textContent = "";
  }
  function setFieldError(key, message) {
    const el = document.getElementById("err-" + key);
    if (el) el.textContent = message;
  }

  async function handleAlbumFormSubmit(evt) {
    evt.preventDefault();

    const input = {
      name: dom.fieldName.value,
      albumNumber: dom.fieldNumber.value,
      releaseYear: dom.fieldYear.value,
      status: dom.fieldStatus.value,
      songCount: dom.fieldSongCount.value,
      description: dom.fieldDescription.value,
      isPublished: dom.fieldPublished.checked
    };

    if (pendingCoverDataUrl) {
      input.coverImage = pendingCoverDataUrl;
    } else if (editingId) {
      // keep whatever cover already exists on the album being edited
      const existing = allAlbums.find(function (a) { return a.id === editingId; });
      input.coverImage = existing ? existing.coverImage : "";
    } else {
      input.coverImage = "";
    }

    ["name", "albumNumber", "releaseYear", "status", "songCount"].forEach(clearFieldError);

    dom.albumSaveBtn.disabled = true;
    try {
      if (editingId) {
        await window.IraivaAlbumsAdmin.updateAlbum(editingId, input);
        showToast("success", "Album updated successfully.");
      } else {
        await window.IraivaAlbumsAdmin.addAlbum(input);
        showToast("success", "Album added successfully.");
      }
      closeAlbumModal();
      await loadAndRender();
    } catch (err) {
      if (err && err.fieldErrors) {
        Object.keys(err.fieldErrors).forEach(function (key) {
          setFieldError(key, err.fieldErrors[key]);
          const fieldEl = document.getElementById(
            key === "name" ? "albumName" :
            key === "albumNumber" ? "albumNumber" :
            key === "releaseYear" ? "albumYear" :
            key === "status" ? "albumStatus" :
            key === "songCount" ? "albumSongCount" : null
          );
          if (fieldEl) fieldEl.classList.add("invalid");
        });
      } else {
        showToast("error", "Something went wrong saving this album. Please try again.");
      }
    } finally {
      dom.albumSaveBtn.disabled = false;
    }
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
    const album = allAlbums.find(function (a) { return a.id === id; });
    if (!album) return;
    deleteTargetId = id;
    dom.deleteAlbumName.textContent = album.name;
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
      await window.IraivaAlbumsAdmin.deleteAlbum(deleteTargetId);
      showToast("success", "Album deleted.");
      closeDeleteModal();
      await loadAndRender();
    } catch (err) {
      showToast("error", "Could not delete this album. Please try again.");
    } finally {
      dom.deleteConfirmBtn.disabled = false;
    }
  }

  /* ---------------------------------------------------------------------
     Modal open/close + escape key
     --------------------------------------------------------------------- */
  function openModal(overlay) {
    overlay.classList.add("open");
    document.body.classList.add("scroll-lock");
  }
  function closeModal(overlay) {
    overlay.classList.remove("open");
    if (!dom.albumModalOverlay.classList.contains("open") && !dom.deleteModalOverlay.classList.contains("open")) {
      document.body.classList.remove("scroll-lock");
    }
  }
  document.addEventListener("keydown", function (evt) {
    if (evt.key !== "Escape") return;
    if (dom.deleteModalOverlay && dom.deleteModalOverlay.classList.contains("open")) closeDeleteModal();
    else if (dom.albumModalOverlay && dom.albumModalOverlay.classList.contains("open")) closeAlbumModal();
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
