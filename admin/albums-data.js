/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin/albums-data.js

   STEP 4B-1 SCOPE ONLY — ALBUM MANAGEMENT DATA LAYER
   --------------------------------------------------------------------------
   This is the ONLY place Album Management reads/writes album data. It is
   deliberately isolated from assets/js/data.js so the PUBLIC WEBSITE is
   never touched by admin edits in this step.

   It reuses the exact STEP 3 album data shape (see assets/js/data.js,
   section 3) as its seed data via window.IraivaData.getAlbums(), then
   layers create / update / delete on top, persisted to localStorage for
   development.

   FUTURE BACKEND SWAP
   --------------------------------------------------------------------------
   Every operation here is async and centralized behind window.IraivaAlbumsAdmin.
   When a real backend exists, only the bodies of these functions need to
   change to fetch()/POST/PUT/DELETE calls — nothing in albums.js (the UI
   layer) needs to change, because it only ever calls these named functions.
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "iraivaAdmin.albums.v1";

  const VALID_STATUSES = ["released", "coming-soon", "draft"];
  const VALID_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const VALID_IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

  let cache = null; // in-memory working set, mirrors localStorage once loaded
  let loadingPromise = null; // in-flight load, shared so concurrent callers don't race separate seed writes

  /* ---------- storage helpers ---------- */

  function readStorage() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeStorage(albums) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
      return { ok: true };
    } catch (err) {
      // localStorage may be unavailable (private mode) or, far more
      // commonly, full — every album's cover image lives as a base64
      // data: URL inside this ONE key, so the whole array is re-written
      // on every save. Once the combined size of all covers crosses the
      // browser's ~5-10MB localStorage quota, setItem throws. Callers
      // roll back their in-memory change and surface `error` so the
      // person sees a real reason instead of a false "success".
      console.warn("IraivaAlbumsAdmin: could not persist to localStorage.", err);
      return { ok: false, error: err };
    }
  }

  function isQuotaError(err) {
    return !!err && (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22 ||
      err.code === 1014
    );
  }

  /* Builds a useful, specific error for a failed write. When the failure
     is a storage-quota problem and the save included an image cover, the
     message is attached as a field error on "cover" so it renders right
     next to the upload control (albums.js already has an #err-cover
     element and already renders any err.fieldErrors it receives) instead
     of a generic, unhelpful toast. */
  function buildPersistError(rawErr, hasImageCover) {
    if (isQuotaError(rawErr)) {
      const err = new Error("Browser storage is full — could not save.");
      if (hasImageCover) {
        err.fieldErrors = {
          cover: "This cover image couldn't be stored — the browser's storage limit for this site has been reached. Try a smaller/lower-resolution photo, or replace another album's cover to free up space."
        };
      }
      return err;
    }
    return new Error("Could not save changes to storage. Please try again.");
  }

  async function ensureLoaded() {
    if (cache) return cache;
    if (loadingPromise) return loadingPromise; // a load is already in flight — share it, don't start another

    loadingPromise = (async function () {
      const stored = readStorage();
      if (stored && Array.isArray(stored)) {
        cache = stored;
        return cache;
      }
      const seed = await global.IraivaData.getAlbums(); // STEP 3 source of truth
      cache = seed.map(function (a) { return Object.assign({}, a); });
      writeStorage(cache);
      return cache;
    })();

    try {
      return await loadingPromise;
    } finally {
      loadingPromise = null; // future calls should re-check cache directly, not replay this promise
    }
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

  function nextId(albums) {
    let max = 0;
    albums.forEach(function (a) {
      const match = /(\d+)$/.exec(String(a.id || ""));
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return "album-" + pad3(max + 1);
  }

  function nextAlbumNumber(albums) {
    let max = 0;
    albums.forEach(function (a) {
      if (typeof a.albumNumber === "number") max = Math.max(max, a.albumNumber);
    });
    return max + 1;
  }

  function nextDisplayOrder(albums) {
    let max = 0;
    albums.forEach(function (a) {
      if (typeof a.displayOrder === "number") max = Math.max(max, a.displayOrder);
    });
    return max + 1;
  }

  /* ---------- validation ---------- */

  function validateAlbumInput(input, isEdit) {
    const errors = {};

    if (!input.name || !String(input.name).trim()) {
      errors.name = "Album name is required.";
    }

    if (!VALID_STATUSES.includes(input.status)) {
      errors.status = "Choose a valid status.";
    }

    if (input.status === "released") {
      if (!input.releaseYear) {
        errors.releaseYear = "Release year is required for a released album.";
      } else if (
        isNaN(input.releaseYear) ||
        Number(input.releaseYear) < 1900 ||
        Number(input.releaseYear) > 2100
      ) {
        errors.releaseYear = "Enter a valid year.";
      }
    } else if (input.releaseYear) {
      if (isNaN(input.releaseYear) || Number(input.releaseYear) < 1900 || Number(input.releaseYear) > 2100) {
        errors.releaseYear = "Enter a valid year.";
      }
    }

    if (input.songCount !== "" && input.songCount != null) {
      if (isNaN(input.songCount) || Number(input.songCount) < 0) {
        errors.songCount = "Song count must be a positive number.";
      }
    }

    if (input.albumNumber !== "" && input.albumNumber != null) {
      if (isNaN(input.albumNumber) || Number(input.albumNumber) < 1) {
        errors.albumNumber = "Album number must be a positive number.";
      }
    }

    return errors;
  }

  function isValidCoverFile(file) {
    if (!file) return true; // cover is optional
    const typeOk = VALID_IMAGE_TYPES.indexOf(file.type) !== -1;
    const extOk = VALID_IMAGE_EXT.test(file.name || "");
    return typeOk || extOk;
  }

  /* ---------- public read operations ---------- */

  async function getAll() {
    const albums = await ensureLoaded();
    return albums.slice().sort(function (a, b) {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }

  async function getById(id) {
    const albums = await ensureLoaded();
    return albums.find(function (a) { return a.id === id; }) || null;
  }

  /* Live song counts, calculated the same way the public site does
     (assets/js/data.js → getAlbumSongCount): only published songs count.
     Albums with no songs yet (new albums, "coming soon") simply won't
     appear in this map, and the UI falls back to the manual baseline
     songCount field stored on the album itself. */
  async function getLiveSongCounts() {
    const songs = await global.IraivaData.getSongs();
    const map = {};
    songs.forEach(function (s) {
      if (!s.isPublished) return;
      map[s.albumId] = (map[s.albumId] || 0) + 1;
    });
    return map;
  }

  async function getDisplayCount(album) {
    const counts = await getLiveSongCounts();
    if (Object.prototype.hasOwnProperty.call(counts, album.id)) {
      return counts[album.id];
    }
    return typeof album.songCount === "number" ? album.songCount : 0;
  }

  /* ---------- public write operations ---------- */

  async function addAlbum(input) {
    const errors = validateAlbumInput(input, false);
    if (Object.keys(errors).length) {
      const err = new Error("Validation failed");
      err.fieldErrors = errors;
      throw err;
    }

    const albums = await ensureLoaded();
    const id = nextId(albums);
    const name = String(input.name).trim();

    const record = {
      id: id,
      albumNumber: input.albumNumber ? Number(input.albumNumber) : nextAlbumNumber(albums),
      name: name,
      slug: slugify(name),
      coverImage: input.coverImage || "",
      releaseYear: input.releaseYear ? Number(input.releaseYear) : null,
      releaseDate: input.releaseYear ? input.releaseYear + "-01-01" : null,
      description: input.description ? String(input.description).trim() : "",
      status: input.status,
      songCount: input.songCount !== "" && input.songCount != null ? Number(input.songCount) : 0,
      displayOrder: nextDisplayOrder(albums),
      isPublished: !!input.isPublished
    };

    albums.push(record);
    const result = writeStorage(albums);
    if (!result.ok) {
      albums.pop(); // keep cache consistent with what actually persisted
      throw buildPersistError(result.error, isDataUrlCover(record.coverImage));
    }
    return record;
  }

  async function updateAlbum(id, input) {
    const errors = validateAlbumInput(input, true);
    if (Object.keys(errors).length) {
      const err = new Error("Validation failed");
      err.fieldErrors = errors;
      throw err;
    }

    const albums = await ensureLoaded();
    const idx = albums.findIndex(function (a) { return a.id === id; });
    if (idx === -1) throw new Error("Album not found: " + id);

    const existing = albums[idx];
    const name = String(input.name).trim();

    const updated = Object.assign({}, existing, {
      albumNumber: input.albumNumber ? Number(input.albumNumber) : existing.albumNumber,
      name: name,
      slug: slugify(name),
      coverImage: input.coverImage !== undefined ? input.coverImage : existing.coverImage,
      releaseYear: input.releaseYear ? Number(input.releaseYear) : null,
      releaseDate: input.releaseYear ? input.releaseYear + "-01-01" : null,
      description: input.description !== undefined ? String(input.description).trim() : existing.description,
      status: input.status,
      songCount: input.songCount !== "" && input.songCount != null ? Number(input.songCount) : existing.songCount,
      isPublished: !!input.isPublished
    });

    albums[idx] = updated;
    const result = writeStorage(albums);
    if (!result.ok) {
      // roll back so the in-memory cache doesn't drift from what actually
      // persisted (e.g. localStorage quota exceeded by a large cover image) —
      // otherwise the edit "succeeds" for this tab but silently vanishes,
      // including the cover image, on the very next refresh.
      albums[idx] = existing;
      // Only blame the cover if this save actually changed it — an edit to
      // just the name/year/description shouldn't point at the image.
      const coverChanged = updated.coverImage !== existing.coverImage;
      throw buildPersistError(result.error, coverChanged && isDataUrlCover(updated.coverImage));
    }
    return updated;
  }

  async function deleteAlbum(id) {
    const albums = await ensureLoaded();
    const idx = albums.findIndex(function (a) { return a.id === id; });
    if (idx === -1) return false;
    const removed = albums[idx];
    albums.splice(idx, 1);
    const result = writeStorage(albums);
    if (!result.ok) {
      // roll back the in-memory delete so cache matches what's actually
      // persisted, otherwise the album reappears (or worse, this failed
      // delete looks successful) until the tab is closed.
      albums.splice(idx, 0, removed);
      throw buildPersistError(result.error, false);
    }
    return true;
  }

  /* Escape hatch back to the original STEP 3 demo data — handy while
     testing, not exposed in the UI by default. */
  async function resetToSeed() {
    const seed = await global.IraivaData.getAlbums();
    cache = seed.map(function (a) { return Object.assign({}, a); });
    writeStorage(cache);
    return cache;
  }

  /* ---------- cover image handling ---------- */

  function isDataUrlCover(coverImage) {
    return typeof coverImage === "string" && coverImage.indexOf("data:") === 0;
  }

  const COVER_MAX_DIMENSION = 1000; // album covers only ever render as cards/thumbnails — no UI here needs more
  const COVER_QUALITY = 0.82; // visually near-lossless for cover art, while cutting multi-MB phone photos way down

  /* Every cover is stored as a base64 data: URL inside the single
     STORAGE_KEY blob, so an uncompressed phone photo (often 3-8MB) can by
     itself blow past the browser's ~5-10MB localStorage quota for this
     origin — especially once a few albums have covers. Downscaling to a
     sane display size and re-encoding as WebP (falls back to PNG if a
     browser's canvas can't encode WebP) keeps typical covers in the
     tens-to-low-hundreds of KB, so many albums with covers can coexist
     without hitting the quota, and it happens automatically for every
     upload — nothing for the person to configure. */
  function compressImageDataUrl(originalDataUrl) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) { reject(new Error("Could not read image dimensions")); return; }

        if (width > COVER_MAX_DIMENSION || height > COVER_MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round(height * (COVER_MAX_DIMENSION / width));
            width = COVER_MAX_DIMENSION;
          } else {
            width = Math.round(width * (COVER_MAX_DIMENSION / height));
            height = COVER_MAX_DIMENSION;
          }
        }

        const canvas = global.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }
        ctx.drawImage(img, 0, 0, width, height);

        try {
          resolve(canvas.toDataURL("image/webp", COVER_QUALITY));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () { reject(new Error("Could not load image for resizing")); };
      img.src = originalDataUrl;
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const original = reader.result;
        // If compression fails for any reason (unsupported format quirk,
        // no canvas, etc.) fall back to the original file untouched rather
        // than blocking the upload — writeStorage()'s own quota handling
        // is still there as a safety net either way.
        compressImageDataUrl(original).then(resolve).catch(function () { resolve(original); });
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  /* Resolves a stored coverImage value (a data: URL from an upload, or a
     project-relative path like "assets/images/album-1.webp" from the
     STEP 3 seed data) to a path usable from inside /admin/. */
  function resolveCoverSrc(coverImage) {
    if (!coverImage) return "";
    if (/^(data:|https?:|\/\/)/i.test(coverImage)) return coverImage;
    if (coverImage.indexOf("../") === 0) return coverImage;
    return "../" + coverImage;
  }

  global.IraivaAlbumsAdmin = {
    getAll: getAll,
    getById: getById,
    getLiveSongCounts: getLiveSongCounts,
    getDisplayCount: getDisplayCount,
    addAlbum: addAlbum,
    updateAlbum: updateAlbum,
    deleteAlbum: deleteAlbum,
    resetToSeed: resetToSeed,
    isValidCoverFile: isValidCoverFile,
    readFileAsDataUrl: readFileAsDataUrl,
    resolveCoverSrc: resolveCoverSrc,
    VALID_STATUSES: VALID_STATUSES
  };
})(window);