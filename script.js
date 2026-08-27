/* ==========================================================================
   IRAIVA MINISTRIES — LYRICS LIBRARY
   script.js

   All content (albums, songs, lyrics, documents, languages) now comes
   from the centralized data layer in assets/js/data.js, via
   IraivaData.getAlbums() / getSongs() / getLanguages() / getMinistries().
   This file only ever reads that data — it never hard-codes song/album
   content — so it stays ready for the future Admin Dashboard, which will
   simply replace what those functions return (e.g. with a fetch() call)
   without any changes needed here.
   ========================================================================== */

/* =========================================================
   1. LOADED CONTENT (populated by loadContent() during init)
   ========================================================= */
let ALBUMS = [];
let SONGS = [];
let LANGUAGES = [];
let MINISTRIES = [];

async function loadContent() {
  [ALBUMS, SONGS, LANGUAGES, MINISTRIES] = await Promise.all([
    IraivaData.getAlbums(),
    IraivaData.getSongs(),
    IraivaData.getLanguages(),
    IraivaData.getMinistries()
  ]);

  // Only published content is ever shown on the public site.
  ALBUMS = IraivaData.getPublishedAlbums(ALBUMS);
  SONGS = IraivaData.getPublishedSongs(SONGS);

  // STEP 4B-3 — overlay documents managed in the Admin Dashboard, if any.
  SONGS = SONGS.map(mergeSongDocuments);

  // STEP 4B-4 — overlay lyrics managed in the Admin Dashboard, if any.
  SONGS = SONGS.map(mergeSongLyrics);
}

/* If the admin dashboard has a record for this song, its `documents` object
   (word/pdf/ppt) is the source of truth — including removals, which is why
   this replaces rather than merges key-by-key. Songs the admin has never
   touched keep the static documents from assets/js/data.js unchanged. */
function mergeSongDocuments(song) {
  if (!window.IraivaSongDocuments) return song;
  const adminDocs = window.IraivaSongDocuments.getSongDocuments(song.id);
  if (adminDocs === null) return song;
  return Object.assign({}, song, { documents: adminDocs });
}

/* If the admin dashboard has a record for this song, its `lyrics` array is
   the source of truth — including an intentional empty array, which is why
   this replaces rather than merges. Songs the admin has never touched keep
   the static lyrics from assets/js/data.js unchanged. */
function mergeSongLyrics(song) {
  if (!window.IraivaSongLyrics) return song;
  const adminLyrics = window.IraivaSongLyrics.getLyrics(song.id);
  if (adminLyrics === null) return song;
  return Object.assign({}, song, { lyrics: adminLyrics });
}

const ICONS = {
  book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" stroke="currentColor" stroke-width="1.6"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13z" stroke="currentColor" stroke-width="1.6"/></svg>',
  disc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>',
  globe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.8-3.8-9s1.3-6.4 3.8-9z" stroke="currentColor" stroke-width="1.6"/></svg>',
  shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.6"/></svg>',
  note: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l11-2v13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="16" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  cap: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3l10 5-10 5L2 8l10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  hands: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 21c-4-2-7-5.5-7-9.5V6l3-2 4 2 4-2 3 2v5.5c0 4-3 7.5-7 9.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  church: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M10 4h4M4 21V12l8-6 8 6v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
};

/* =========================================================
   2. STATE
   ========================================================= */
const state = {
  activeFilter: "all",
  searchTerm: "",
  currentSongId: null,
  isPlaying: false,
  visibleSongCount: 8
};

/* =========================================================
   3. HEADER — sticky glass + mobile menu
   ========================================================= */
function initHeader() {
  const header = document.getElementById("siteHeader");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      nav.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

/* =========================================================
   4. STATS
   Numbers are calculated live from the centralized data —
   never hard-coded (see section 15 of the STEP 3 spec).
   ========================================================= */
function renderStats() {
  const computed = IraivaData.computeStats(ALBUMS, SONGS, LANGUAGES);
  const SITE_STATS = [
    { icon: "book", value: `${computed.totalSongs}+`, label: "Songs & Lyrics" },
    { icon: "disc", value: String(computed.releasedAlbumCount), label: "Albums Released" },
    { icon: "globe", value: String(computed.languageCount), label: "Languages Supported" },
    { icon: "shield", value: `${computed.lyricsFocusedPercent}%`, label: "Lyrics Focused" }
  ];

  const row = document.getElementById("statsRow");
  row.innerHTML = SITE_STATS.map((s) => `
    <div class="stat-card">
      <span class="stat-icon">${ICONS[s.icon] || ""}</span>
      <div class="stat-num">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join("");

  const albumsCountTag = document.getElementById("albumsCountTag");
  if (albumsCountTag) {
    albumsCountTag.textContent = `${computed.releasedAlbumCount} Albums Released`;
  }
}

/* =========================================================
   5. MINISTRIES
   ========================================================= */
function renderMinistries() {
  const grid = document.getElementById("ministriesGrid");
  grid.innerHTML = MINISTRIES.map((m) => `
    <div class="ministry-card">
      <div class="ministry-icon">${ICONS[m.icon] || ""}</div>
      <h3>${m.title}</h3>
      <p>${m.desc}</p>
    </div>
  `).join("");

  const footerList = document.getElementById("footerMinistries");
  footerList.innerHTML = MINISTRIES.map((m) => `<li><a href="#ministries">${m.title}</a></li>`).join("");
}

/* =========================================================
   6. ALBUMS + CONTINUOUS SLIDER
   ========================================================= */
function albumCardHTML(album) {
  if (album.status === "coming-soon") {
    return `
      <div class="album-card coming-soon" data-album-id="${album.id}">
        <span class="soon-icon">${ICONS.disc}</span>
        <span class="soon-top">${album.albumNumber ? ordinal(album.albumNumber) + " Album" : "New Album"}</span>
        <h3 class="soon-title">Coming Soon</h3>
        <p class="soon-verse">&ldquo;See, I am doing a new thing!&rdquo; — Isaiah 43:19</p>
      </div>`;
  }
  const songCount = IraivaData.getAlbumSongCount(SONGS, album.id);
  const cover = album.coverImage || "assets/images/iraiva-logo.webp";
  return `
    <div class="album-card" data-album-id="${album.id}">
      <div class="album-cover-wrap">
        <img class="album-cover" src="${cover}" alt="${album.name} album cover" loading="lazy" onerror="this.src='assets/images/iraiva-logo.webp';">
        <span class="album-badge">Released</span>
      </div>
      <div class="album-body">
        <h3 class="album-name">${album.name}</h3>
        <div class="album-meta"><span>${album.releaseYear || ""}</span><span>${songCount} Songs</span></div>
        <button class="btn-view-songs" data-filter-album="${album.id}">View Songs</button>
      </div>
    </div>`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

let sliderState = {
  track: null,
  viewport: null,
  offset: 0,
  speed: 0.45, // px per frame, gentle continuous motion
  paused: false,
  singleSetWidth: 0,
  raf: null,
  dragging: false,
  dragStartX: 0,
  dragStartOffset: 0
};

function initAlbumSlider() {
  const track = document.getElementById("albumSliderTrack");
  const viewport = track.parentElement;
  // Sorted by displayOrder so newly-added albums slot in correctly,
  // however many there are.
  const sorted = [...ALBUMS].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const setAlbums = sorted.filter(Boolean);

  if (!setAlbums.length) return;

  // Render three copies for a seamless infinite loop
  const oneSetHTML = setAlbums.map(albumCardHTML).join("");
  track.innerHTML = oneSetHTML + oneSetHTML + oneSetHTML;

  sliderState.track = track;
  sliderState.viewport = viewport;

  requestAnimationFrame(() => {
    const firstSetEls = Array.from(track.children).slice(0, setAlbums.length);
    let width = 0;
    firstSetEls.forEach((el) => { width += el.getBoundingClientRect().width + 22; });
    sliderState.singleSetWidth = width;
    sliderState.offset = width; // start at the middle copy
    applySliderTransform();
    startSliderLoop();
  });

  viewport.addEventListener("mouseenter", () => { sliderState.paused = true; });
  viewport.addEventListener("mouseleave", () => { sliderState.paused = false; });

  // touch / drag support
  viewport.addEventListener("pointerdown", (e) => {
    sliderState.dragging = true;
    sliderState.paused = true;
    sliderState.dragStartX = e.clientX;
    sliderState.dragStartOffset = sliderState.offset;
    viewport.classList.add("dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!sliderState.dragging) return;
    const dx = e.clientX - sliderState.dragStartX;
    sliderState.offset = sliderState.dragStartOffset - dx;
    applySliderTransform();
  });
  window.addEventListener("pointerup", () => {
    if (!sliderState.dragging) return;
    sliderState.dragging = false;
    sliderState.paused = false;
    viewport.classList.remove("dragging");
  });

  document.getElementById("sliderPrev").addEventListener("click", () => {
    sliderState.offset -= 260;
    applySliderTransform();
  });
  document.getElementById("sliderNext").addEventListener("click", () => {
    sliderState.offset += 260;
    applySliderTransform();
  });

  // event delegation for "View Songs"
  track.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter-album]");
    if (!btn) return;
    const albumId = btn.getAttribute("data-filter-album");
    setActiveFilter(albumId);
    document.getElementById("lyrics").scrollIntoView({ behavior: "smooth" });
  });
}

function applySliderTransform() {
  const { track, singleSetWidth } = sliderState;
  if (!track || !singleSetWidth) return;
  // wrap seamlessly within the middle copy's range
  if (sliderState.offset >= singleSetWidth * 2) sliderState.offset -= singleSetWidth;
  if (sliderState.offset <= 0) sliderState.offset += singleSetWidth;
  track.style.transform = `translateX(${-sliderState.offset}px)`;
}

function startSliderLoop() {
  const step = () => {
    if (!sliderState.paused && !sliderState.dragging) {
      sliderState.offset += sliderState.speed;
      applySliderTransform();
    }
    sliderState.raf = requestAnimationFrame(step);
  };
  sliderState.raf = requestAnimationFrame(step);
}

/* =========================================================
   7. SONGS TABLE / FILTER / SEARCH
   ========================================================= */
function renderFilterTabs() {
  const wrap = document.getElementById("filterTabs");
  // Dynamically generated from album data — a newly published album
  // (or a coming-soon album that becomes released) automatically gets
  // its own filter tab, with no fixed cap on the number of albums.
  const filterableAlbums = ALBUMS
    .filter((a) => a.status !== "coming-soon")
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const tabs = [{ id: "all", label: "All" }, ...filterableAlbums.map((a) => ({ id: a.id, label: a.name.toUpperCase() }))];
  wrap.innerHTML = tabs.map((t) => `
    <button class="filter-tab ${t.id === state.activeFilter ? "active" : ""}" data-filter="${t.id}" role="tab" aria-selected="${t.id === state.activeFilter}">${t.label}</button>
  `).join("");

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    setActiveFilter(btn.getAttribute("data-filter"));
  });
}

function setActiveFilter(filterId) {
  state.activeFilter = filterId;
  document.querySelectorAll(".filter-tab").forEach((btn) => {
    const active = btn.getAttribute("data-filter") === filterId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  state.visibleSongCount = 8;
  renderSongs();
}

function getFilteredSongs() {
  let list = SONGS;
  if (state.activeFilter !== "all") {
    list = list.filter((s) => s.albumId === state.activeFilter);
  }
  if (state.searchTerm.trim()) {
    const term = state.searchTerm.trim().toLowerCase();
    // Section 12 — search matches title, album name, artist, language
    // AND full lyrics text, not just a short preview.
    list = list.filter((s) => {
      const lyricsText = (s.lyrics || []).map((l) => l.text).join(" ").toLowerCase();
      return (
        s.title.toLowerCase().includes(term) ||
        albumNameById(s.albumId).toLowerCase().includes(term) ||
        (s.artist || "").toLowerCase().includes(term) ||
        (s.language || "").toLowerCase().includes(term) ||
        lyricsText.includes(term)
      );
    });
  }
  return list;
}

function albumNameById(id) {
  const a = IraivaData.getAlbumById(ALBUMS, id);
  return a ? a.name : "";
}

function lyricsPreview(song) {
  if (song.lyrics && song.lyrics.length) return song.lyrics[0].text;
  return "Lyrics preview not available.";
}

function renderSongs() {
  const filtered = getFilteredSongs();
  const visible = filtered.slice(0, state.visibleSongCount);

  const tbody = document.getElementById("songsTableBody");
  const cardsWrap = document.getElementById("songsCards");

  if (!visible.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:var(--gray-600);">No songs match your search.</td></tr>`;
    cardsWrap.innerHTML = `<p style="text-align:center; color:var(--gray-600); padding:20px;">No songs match your search.</p>`;
  } else {
    tbody.innerHTML = visible.map((song, i) => songRowHTML(song, i + 1)).join("");
    cardsWrap.innerHTML = visible.map((song, i) => songCardHTML(song, i + 1)).join("");
  }

  const viewAllBtn = document.getElementById("viewAllBtn");
  viewAllBtn.style.display = filtered.length > state.visibleSongCount ? "inline-block" : "none";

  refreshSongListPlaybackState();
}

function downloadActionsHTML(song) {
  const docs = song.documents || {};
  const formats = [["word", "Word"], ["pdf", "PDF"], ["ppt", "PPT"]];
  return formats.map(([key, label]) => {
    const available = !!docs[key];
    return available
      ? `<button class="act-btn act-${key}" data-download="${key}" data-song="${song.id}">${label}</button>`
      : `<button class="act-btn act-${key} unavailable" disabled title="Not Available">${label}</button>`;
  }).join("");
}

function songRowHTML(song, num) {
  return `
    <tr data-song-id="${song.id}">
      <td class="col-num">${String(num).padStart(2, "0")}</td>
      <td class="col-title"><strong>${song.title}</strong></td>
      <td class="col-album">${albumNameById(song.albumId)}</td>
      <td class="col-lang"><span class="badge-lang">${song.language}</span></td>
      <td class="col-preview">${lyricsPreview(song)}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="act-btn act-view" data-play="${song.id}">Play</button>
          ${downloadActionsHTML(song)}
        </div>
      </td>
    </tr>`;
}

function songCardHTML(song, num) {
  return `
    <div class="song-card" data-song-id="${song.id}">
      <div class="song-card-top">
        <div>
          <div class="song-card-title">${String(num).padStart(2, "0")}. ${song.title}</div>
          <div class="song-card-meta">${albumNameById(song.albumId)} · ${song.language}</div>
        </div>
        <button class="act-btn act-view" data-play="${song.id}">Play</button>
      </div>
      <p class="song-card-preview">${lyricsPreview(song)}</p>
      <div class="song-card-actions">
        ${downloadActionsHTML(song)}
      </div>
    </div>`;
}

function initSongInteractions() {
  document.getElementById("songsTableBody").addEventListener("click", handleSongAreaClick);
  document.getElementById("songsCards").addEventListener("click", handleSongAreaClick);

  document.getElementById("viewAllBtn").addEventListener("click", () => {
    state.visibleSongCount += 12;
    renderSongs();
  });

  const tableSearch = document.getElementById("tableSearchInput");
  tableSearch.addEventListener("input", (e) => {
    state.searchTerm = e.target.value;
    state.visibleSongCount = 8;
    renderSongs();
  });

  // Sidebar "Download Lyrics" panel clicks are wired in initializePlayer(),
  // since that panel always tracks the currently loaded song.
}

function handleSongAreaClick(e) {
  const playBtn = e.target.closest("[data-play]");
  if (playBtn) {
    const songId = playBtn.getAttribute("data-play");
    if (songId === state.currentSongId) {
      togglePlay();
    } else {
      loadSong(songId, true);
    }
    return;
  }
  const dlBtn = e.target.closest("[data-download]");
  if (dlBtn) {
    const songId = dlBtn.getAttribute("data-song");
    const format = dlBtn.getAttribute("data-download");
    triggerDownload(songId, format);
  }
}

/* =========================================================
   8. HERO SEARCH
   ========================================================= */
function initHeroSearch() {
  const form = document.getElementById("heroSearchForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const term = document.getElementById("heroSearchInput").value;
    state.searchTerm = term;
    state.activeFilter = "all";
    setActiveFilter("all");
    document.getElementById("tableSearchInput").value = term;
    document.getElementById("lyrics").scrollIntoView({ behavior: "smooth" });
  });
}

/* =========================================================
   9. NOW PLAYING + MUSIC PLAYER
   Spotify-style synchronized lyrics, real playback, downloads.
   ========================================================= */

/* ---- 9.1 Global player state ---- */
let audioPlayer = null;      // the single <audio id="audioPlayer"> element
let currentSong = null;      // the currently loaded song object (single source of truth)
let currentLyricIndex = -1;  // index of the active lyric line, -1 = none yet
let volumeBeforeMute = 0.8;  // remembered volume for the mute toggle
let playerRafId = null;      // requestAnimationFrame handle for the sync loop

/* Cached DOM references, filled in by initializePlayer() */
let els = {};

/* ---- 9.2 Formatting ---- */
function formatTime(sec) {
  if (sec === undefined || sec === null || isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ---- 9.3 Status / loading / error messaging ---- */
function showStatus(message, isError) {
  [els.playerStatus, els.npStatus].forEach((el) => {
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
  });
}

function handleAudioError() {
  setPlayingUI(false);
  showStatus("Unable to play this audio file.", true);
}

/* Resolves a stored audioFile value to a src the <audio> element can play:
   a normal path/URL/data-URL is used as-is (unchanged from before), and an
   "indexeddb:<songId>" marker (audio saved via the admin dashboard's
   IndexedDB storage) is resolved to a temporary Blob object URL. */
async function resolveSongAudioSrc(audioFile) {
  if (!audioFile) return "";
  if (audioFile.indexOf("indexeddb:") === 0) {
    const songId = audioFile.slice("indexeddb:".length);
    if (!window.IraivaData || !window.IraivaData.getAudioBlob) return "";
    try {
      const blob = await window.IraivaData.getAudioBlob(songId);
      return blob ? URL.createObjectURL(blob) : "";
    } catch (err) {
      return "";
    }
  }
  return audioFile;
}

/* ---- 9.4 Loading a song (single source of truth = the song object) ---- */
async function loadSong(songId, autoPlay) {
  if (autoPlay === undefined) autoPlay = true;
  const song = SONGS.find((s) => s.id === songId);
  if (!song) return;

  currentSong = song;
  state.currentSongId = songId;
  currentLyricIndex = -1;

  updatePlayerUI(song);
  renderLyrics(song);
  updateDownloadPanel(song);
  refreshSongListPlaybackState();

  els.currentTime.textContent = "0:00";
  els.duration.textContent = "0:00";
  els.progressBar.value = 0;
  els.progressBar.style.setProperty("--progress", "0%");

  audioPlayer.pause();

  const audioSrc = await resolveSongAudioSrc(song.audioFile);

  // A song created in the Admin Dashboard before an audio file is
  // uploaded has an empty audioFile. Setting audio.src = "" makes the
  // browser resolve it to the current page URL and try to "play" the
  // HTML document, which fails with a confusing error — so this is
  // guarded explicitly instead of ever assigning an empty src.
  if (audioSrc) {
    showStatus("Loading…", false);
    audioPlayer.src = audioSrc;
    audioPlayer.load();

    audioPlayer.addEventListener("loadedmetadata", function onReady() {
      showStatus("", false);
      els.duration.textContent = formatTime(audioPlayer.duration);
      if (autoPlay) playCurrentSong();
    }, { once: true });
  } else {
    audioPlayer.removeAttribute("src");
    audioPlayer.load();
    showStatus("No audio available for this song yet.", true);
  }

  document.getElementById("nowPlaying").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---- 9.5 Now Playing / sticky bar UI ---- */
function updatePlayerUI(song) {
  const albumName = albumNameById(song.albumId);
  const album = IraivaData.getAlbumById(ALBUMS, song.albumId);
  const cover = (album && album.coverImage) || song.coverImage || "assets/images/iraiva-logo.webp";

  els.playerCover.src = cover;
  els.playerTitle.textContent = song.title;
  els.playerAlbum.textContent = albumName || "";

  els.npCover.src = cover;
  els.npTitle.textContent = song.title;
  els.npAlbum.textContent = [albumName, song.artist, song.language].filter(Boolean).join(" · ");

  els.playerCover.onerror = () => { els.playerCover.src = "assets/images/iraiva-logo.webp"; };
  els.npCover.onerror = () => { els.npCover.src = "assets/images/iraiva-logo.webp"; };
}

function setPlayingUI(playing) {
  state.isPlaying = playing;
  const icon = els.playIcon;
  if (playing) {
    icon.innerHTML = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
    els.playBtn.setAttribute("aria-label", "Pause");
  } else {
    icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    els.playBtn.setAttribute("aria-label", "Play");
  }
  refreshSongListPlaybackState();
}

/* Keep the All Songs table/cards in sync with what's currently playing */
function refreshSongListPlaybackState() {
  document.querySelectorAll("[data-play]").forEach((btn) => {
    const id = btn.getAttribute("data-play");
    const row = btn.closest("tr, .song-card");
    const isCurrent = currentSong && id === currentSong.id;
    if (row) row.classList.toggle("playing", !!isCurrent);
    if (isCurrent) {
      btn.textContent = state.isPlaying ? "Pause" : "Play";
      btn.classList.add("is-current");
    } else {
      btn.textContent = "Play";
      btn.classList.remove("is-current");
    }
  });
}

/* ---- 9.6 Lyrics rendering + synchronization ---- */
function renderLyrics(song) {
  currentLyricIndex = -1;
  const list = els.npLyricsList;
  if (!song.lyrics || !song.lyrics.length) {
    list.innerHTML = `<li class="lyrics-empty">Lyrics are not available for this song.</li>`;
    return;
  }
  list.innerHTML = song.lyrics.map((line, i) => `
    <li class="lyric-line" data-index="${i}" data-time="${line.time}" tabindex="0" role="button">${line.text}</li>
  `).join("");
}

/* Determine + apply the active lyric line based on real audio.currentTime.
   Only touches the DOM when the active index actually changes. */
function updateLyrics() {
  if (!currentSong || !currentSong.lyrics || !currentSong.lyrics.length) return;
  const t = audioPlayer.currentTime;
  let activeIndex = 0;
  for (let i = 0; i < currentSong.lyrics.length; i++) {
    if (currentSong.lyrics[i].time <= t) activeIndex = i;
    else break;
  }
  if (activeIndex === currentLyricIndex) return;
  currentLyricIndex = activeIndex;

  const items = els.npLyricsList.querySelectorAll(".lyric-line");
  items.forEach((el) => el.classList.remove("current"));
  const activeEl = items[activeIndex];
  if (activeEl) {
    activeEl.classList.add("current");
    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function seekToLyric(time) {
  if (!currentSong) return;
  audioPlayer.currentTime = time;
  currentLyricIndex = -1;
  updateLyrics();
  if (audioPlayer.paused) playCurrentSong();
}

/* ---- 9.7 Progress bar / time display ---- */
function updateProgress() {
  if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
  const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  els.progressBar.value = pct;
  els.progressBar.style.setProperty("--progress", `${pct}%`);
  els.currentTime.textContent = formatTime(audioPlayer.currentTime);
}

/* Smooth sync loop: only does work while audio is actually playing */
function playerTick() {
  if (audioPlayer && !audioPlayer.paused && !audioPlayer.ended) {
    updateProgress();
    updateLyrics();
  }
  playerRafId = requestAnimationFrame(playerTick);
}

/* ---- 9.8 Transport controls ---- */
function playCurrentSong() {
  if (!currentSong) {
    if (SONGS.length) loadSong(SONGS[0].id, true);
    return;
  }
  const p = audioPlayer.play();
  if (p && p.catch) {
    p.catch(() => { /* autoplay/demo-file playback may be blocked by the browser */ });
  }
}

function pauseCurrentSong() {
  audioPlayer.pause();
}

function togglePlay() {
  if (!currentSong) { loadSong(SONGS[0].id, true); return; }
  if (audioPlayer.paused) playCurrentSong(); else pauseCurrentSong();
}

function stepSong(dir) {
  if (!SONGS.length) return;
  const idx = currentSong ? SONGS.findIndex((s) => s.id === currentSong.id) : -1;
  const nextIdx = idx === -1 ? 0 : (idx + dir + SONGS.length) % SONGS.length;
  loadSong(SONGS[nextIdx].id, true);
}
function nextSong() { stepSong(1); }
function previousSong() { stepSong(-1); }

/* ---- 9.9 Download panel — always matches the current song ---- */
function checkFileExists(path) {
  if (!path) return Promise.resolve(false);
  return fetch(path, { method: "HEAD" })
    .then((res) => res.ok)
    .catch(() => false);
}

function updateDownloadPanel(song) {
  const docs = song.documents || {};
  document.querySelectorAll(".download-row").forEach((btn) => {
    const format = btn.getAttribute("data-format");
    const entry = docs[format];
    btn.dataset.song = song.id;

    // Section 7 — a song doesn't have to have every format. If the field
    // itself is missing there's no point doing a network check.
    if (!entry) {
      btn.disabled = true;
      btn.classList.add("unavailable");
      const ext = btn.querySelector(".dl-ext");
      if (ext) ext.textContent = "Not Available";
      return;
    }

    const ext = btn.querySelector(".dl-ext");
    const extLabel = `.${format === "word" ? "docx" : format === "ppt" ? "pptx" : "pdf"}`;

    // A file uploaded through the admin (data URL) is already in the
    // browser — no need to check whether a path exists on the server.
    if (window.IraivaSongDocuments && window.IraivaSongDocuments.isUploadedDocument(entry)) {
      btn.disabled = false;
      btn.classList.remove("unavailable");
      if (ext) ext.textContent = extLabel;
      return;
    }

    btn.disabled = false;
    btn.classList.remove("unavailable");

    checkFileExists(entry).then((exists) => {
      // Ignore stale results if the user already switched songs.
      if (!currentSong || currentSong.id !== song.id) return;
      btn.disabled = !exists;
      btn.classList.toggle("unavailable", !exists);
      if (ext) ext.textContent = exists ? extLabel : "Not Available";
    });
  });
}

function triggerDownload(songId, format) {
  const song = SONGS.find((s) => s.id === songId);
  if (!song || !song.documents) return;
  const entry = song.documents[format];
  if (!entry) return; // gracefully do nothing — button should already be disabled

  const isUploaded = window.IraivaSongDocuments && window.IraivaSongDocuments.isUploadedDocument(entry);
  const link = document.createElement("a");
  link.href = isUploaded ? entry.dataUrl : entry;
  link.download = isUploaded ? (entry.fileName || "") : "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---- 9.10 Volume + mute ---- */
function updateMuteIcon() {
  const isMuted = audioPlayer.muted || audioPlayer.volume === 0;
  els.muteBtn.classList.toggle("is-muted", isMuted);
  els.muteBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
  els.volumeIcon.innerHTML = isMuted
    ? '<path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.45 2.45c.03-.2.05-.43.05-.65zM19 12c0 .94-.2 1.82-.54 2.64L19.97 16.1A8.9 8.9 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.9 8.9 0 0 0 3.69-1.81L18.73 21 20 19.73 4.27 3zM12 4l-1.88 1.88L12 7.76V4z"/>'
    : '<path d="M4 9v6h4l5 5V4L8 9H4z"/>';
}

function initVolumeControls() {
  audioPlayer.volume = 0.8;
  updateMuteIcon();

  els.volumeBar.addEventListener("input", () => {
    const val = Number(els.volumeBar.value) / 100;
    audioPlayer.muted = false;
    audioPlayer.volume = val;
    if (val > 0) volumeBeforeMute = val;
    updateMuteIcon();
  });

  els.muteBtn.addEventListener("click", () => {
    if (audioPlayer.muted || audioPlayer.volume === 0) {
      audioPlayer.muted = false;
      audioPlayer.volume = volumeBeforeMute > 0 ? volumeBeforeMute : 0.8;
      els.volumeBar.value = audioPlayer.volume * 100;
    } else {
      volumeBeforeMute = audioPlayer.volume;
      audioPlayer.muted = true;
    }
    updateMuteIcon();
  });
}

/* ---- 9.11 Keyboard accessibility ---- */
function initPlayerKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable)) return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowRight" && currentSong) {
      audioPlayer.currentTime = Math.min((audioPlayer.currentTime || 0) + 5, audioPlayer.duration || Infinity);
    } else if (e.code === "ArrowLeft" && currentSong) {
      audioPlayer.currentTime = Math.max((audioPlayer.currentTime || 0) - 5, 0);
    }
  });
}

/* ---- 9.12 Wire everything together ---- */
function initializePlayer() {
  els = {
    playBtn: document.getElementById("playBtn"),
    playIcon: document.getElementById("playIcon"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    progressBar: document.getElementById("progressBar"),
    volumeBar: document.getElementById("volumeBar"),
    muteBtn: document.getElementById("muteBtn"),
    volumeIcon: document.getElementById("volumeIcon"),
    currentTime: document.getElementById("currentTime"),
    duration: document.getElementById("duration"),
    playerCover: document.getElementById("playerCover"),
    playerTitle: document.getElementById("playerTitle"),
    playerAlbum: document.getElementById("playerAlbum"),
    playerStatus: document.getElementById("playerStatus"),
    npCover: document.getElementById("npCover"),
    npTitle: document.getElementById("npTitle"),
    npAlbum: document.getElementById("npAlbum"),
    npStatus: document.getElementById("npStatus"),
    npLyricsList: document.getElementById("npLyricsList")
  };

  audioPlayer = document.getElementById("audioPlayer");

  els.playBtn.addEventListener("click", togglePlay);
  els.prevBtn.addEventListener("click", previousSong);
  els.nextBtn.addEventListener("click", nextSong);

  audioPlayer.addEventListener("play", () => setPlayingUI(true));
  audioPlayer.addEventListener("pause", () => setPlayingUI(false));
  audioPlayer.addEventListener("ended", () => {
    setPlayingUI(false);
    nextSong();
  });
  audioPlayer.addEventListener("error", handleAudioError);
  audioPlayer.addEventListener("timeupdate", () => {
    updateProgress();
    updateLyrics();
  });
  audioPlayer.addEventListener("loadedmetadata", () => {
    els.duration.textContent = formatTime(audioPlayer.duration);
  });

  els.progressBar.addEventListener("input", () => {
    if (audioPlayer.duration) {
      audioPlayer.currentTime = (els.progressBar.value / 100) * audioPlayer.duration;
    }
    els.progressBar.style.setProperty("--progress", `${els.progressBar.value}%`);
  });

  els.npLyricsList.addEventListener("click", (e) => {
    const line = e.target.closest(".lyric-line");
    if (!line) return;
    seekToLyric(parseFloat(line.getAttribute("data-time")));
  });
  els.npLyricsList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const line = e.target.closest(".lyric-line");
    if (!line) return;
    e.preventDefault();
    seekToLyric(parseFloat(line.getAttribute("data-time")));
  });

  document.querySelectorAll(".download-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const format = btn.getAttribute("data-format");
      const songId = currentSong ? currentSong.id : SONGS[0].id;
      triggerDownload(songId, format);
    });
  });

  initVolumeControls();
  initPlayerKeyboardShortcuts();

  playerRafId = requestAnimationFrame(playerTick);
}

/* =========================================================
   10. REQUEST SONG MODAL
   ========================================================= */
function initModal() {
  const overlay = document.getElementById("modalOverlay");
  const openBtn = document.getElementById("requestSongBtn");
  const closeBtn = document.getElementById("modalClose");
  const form = document.getElementById("requestForm");

  const open = () => { overlay.classList.add("open"); document.getElementById("reqSong").focus(); };
  const close = () => { overlay.classList.remove("open"); };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const songVal = document.getElementById("reqSong").value;
    const albumVal = document.getElementById("reqAlbum").value;

    // STEP 4B6: persist the request so it shows up in Admin > Song Requests.
    if (window.IraivaRequestsData) {
      window.IraivaRequestsData.createRequest({
        song: songVal,
        message: albumVal ? ("Album: " + albumVal) : ""
      });
    }

    close();
    form.reset();
    alert("Thank you! Your song request has been noted.");
  });
}

/* =========================================================
   11. NEWSLETTER
   ========================================================= */
function initNewsletter() {
  const form = document.getElementById("newsletterForm");
  const msg = document.getElementById("newsletterMsg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "Thanks for subscribing — updates are on their way.";
    form.reset();
  });
}

/* =========================================================
   12. INIT
   Content is loaded from the centralized data layer first
   (assets/js/data.js — see loadContent() near the top of this file),
   then every render/interaction function runs against that data.
   Swapping loadContent() to pull from a real API later requires no
   changes to anything below this comment.
   ========================================================= */
async function init() {
  document.getElementById("footerYear").textContent = new Date().getFullYear();

  await loadContent();

  initHeader();
  renderStats();
  renderMinistries();
  initAlbumSlider();
  renderFilterTabs();
  renderSongs();
  initSongInteractions();
  initHeroSearch();
  initializePlayer();
  initModal();
  initNewsletter();
}

init();