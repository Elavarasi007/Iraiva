/* ==========================================================================
   IRAIVA MINISTRIES — LYRICS LIBRARY
   assets/js/data.js

   CENTRALIZED CONTENT / DATA LAYER
   ------------------------------------------------------------------------
   This file is the SINGLE SOURCE OF TRUTH for all site content:
   albums, songs, synchronized lyrics, downloadable documents and the
   supported language list.

   Nothing in index.html, script.js or anywhere else in this project should
   hard-code song/album/lyrics information. Every part of the public site
   reads from the data defined here, through the getAlbums() / getSongs() /
   getLanguages() functions at the bottom of this file.

   WHY THIS MATTERS FOR THE FUTURE ADMIN DASHBOARD
   ------------------------------------------------------------------------
   Right now the "database" is just JavaScript objects living in memory.
   Later, this file (or just the three getX() functions) can be swapped
   for real network calls — e.g.

       async function getAlbums() {
         const res = await fetch("/api/albums");
         return res.json();
       }

   — without touching any rendering/interaction code in script.js, because
   script.js never reads the ALBUMS/SONGS/LANGUAGES arrays directly. It
   only calls IraivaData.getAlbums(), IraivaData.getSongs() and
   IraivaData.getLanguages().
   ========================================================================== */

(function (global) {
  "use strict";

  /* ========================================================================
     1. LANGUAGES
     A centralized list of languages songs can be tagged with.
     (No language selector is added to the header — this is used for song
     filtering, search and future dashboard management only.)
     ======================================================================== */
  const LANGUAGES = [
    { id: "tamil", name: "Tamil", code: "ta" },
    { id: "english", name: "English", code: "en" },
    { id: "telugu", name: "Telugu", code: "te" },
    { id: "malayalam", name: "Malayalam", code: "ml" }
  ];

  /* ========================================================================
     2. MINISTRIES
     Content for the "Our Ministries" section + footer ministry links.
     ======================================================================== */
  const MINISTRIES = [
    {
      id: "production",
      icon: "note",
      title: "Iraiva Music Production",
      desc: "Creating Spirit-filled music that touches hearts and glorifies God."
    },
    {
      id: "academy",
      icon: "cap",
      title: "Iraiva Music Academy",
      desc: "Training and equipping the next generation of worshippers."
    },
    {
      id: "worship-school",
      icon: "hands",
      title: "Iraiva School of Worship",
      desc: "Equipping believers in the art of worship and leading God's presence."
    },
    {
      id: "sanctuary",
      icon: "church",
      title: "Iraiva Sanctuary",
      desc: "A place of worship, prayer and transformation through God's presence."
    }
  ];

  /* ========================================================================
     3. ALBUMS
     ------------------------------------------------------------------------
     Fields (per the STEP 3 data model):
       id            unique string id, e.g. "album-001"
       albumNumber   numeric position, e.g. 1
       name          display name, e.g. "Iraiva 1"
       slug          URL-friendly identifier, e.g. "iraiva-1"
       coverImage    path to cover artwork
       releaseYear   number or null (unreleased)
       releaseDate   ISO date string or null
       description   short text description
       status        "released" | "coming-soon" | "draft"
       songCount     manually-set baseline count (the PUBLIC SITE does not
                     trust this value for display — see getAlbumSongCount()
                     below, which always calculates the real, live count
                     from published songs. The field is kept here because
                     the future dashboard needs somewhere to store it while
                     an album's songs are still being entered.)
       displayOrder  sort order for slider / lists
       isPublished   only published albums appear on the public site

     IMPORTANT: This array is NOT capped at 7. The dashboard can add
     album-008, album-009, etc. and the whole site (slider, filters,
     stats) will automatically pick them up — see section 6, "SUPPORT FOR
     UNLIMITED ALBUMS".
     ======================================================================== */
  const ALBUMS = [
    {
      id: "album-001", albumNumber: 1, name: "Iraiva 1", slug: "iraiva-1",
      coverImage: "assets/images/album-1.webp",
      releaseYear: 2008, releaseDate: "2008-01-01",
      description: "The first Iraiva Ministries worship album.",
      status: "released", songCount: 9, displayOrder: 1, isPublished: true
    },
    {
      id: "album-002", albumNumber: 2, name: "Iraiva 2", slug: "iraiva-2",
      coverImage: "assets/images/album-2.webp",
      releaseYear: 2010, releaseDate: "2010-01-01",
      description: "The second Iraiva Ministries worship album.",
      status: "released", songCount: 11, displayOrder: 2, isPublished: true
    },
    {
      id: "album-003", albumNumber: 3, name: "Iraiva 3", slug: "iraiva-3",
      coverImage: "assets/images/album-3.webp",
      releaseYear: 2012, releaseDate: "2012-01-01",
      description: "The third Iraiva Ministries worship album.",
      status: "released", songCount: 9, displayOrder: 3, isPublished: true
    },
    {
      id: "album-004", albumNumber: 4, name: "Iraiva 4", slug: "iraiva-4",
      coverImage: "assets/images/album-4.webp",
      releaseYear: 2013, releaseDate: "2013-01-01",
      description: "The fourth Iraiva Ministries worship album.",
      status: "released", songCount: 9, displayOrder: 4, isPublished: true
    },
    {
      id: "album-005", albumNumber: 5, name: "Iraiva 5", slug: "iraiva-5",
      coverImage: "assets/images/album-5.webp",
      releaseYear: 2015, releaseDate: "2015-01-01",
      description: "The fifth Iraiva Ministries worship album.",
      status: "released", songCount: 10, displayOrder: 5, isPublished: true
    },
    {
      id: "album-006", albumNumber: 6, name: "Iraiva 6", slug: "iraiva-6",
      coverImage: "assets/images/album-6.webp",
      releaseYear: 2018, releaseDate: "2018-01-01",
      description: "The sixth Iraiva Ministries worship album.",
      status: "released", songCount: 9, displayOrder: 6, isPublished: true
    },
    {
      id: "album-007", albumNumber: 7, name: "Iraiva 7", slug: "iraiva-7",
      coverImage: "assets/images/album-7.webp",
      releaseYear: null, releaseDate: null,
      description: "The seventh Iraiva Ministries worship album — coming soon.",
      status: "coming-soon", songCount: null, displayOrder: 7, isPublished: true
    }
  ];

  /* ========================================================================
     4. SONGS
     ------------------------------------------------------------------------
     Fields (per the STEP 3 data model):
       id            unique string id, e.g. "song-001"
       albumId       links to ALBUMS[].id — album info is NOT duplicated
                     on the song; look it up with getAlbumById()
       trackNumber   position within its album
       title         song title
       slug          URL-friendly identifier
       artist        performing artist / ministry
       language      one of LANGUAGES[].name
       duration      approximate length in seconds
       audioFile     path to the playable audio file
       coverImage    path to song-specific art (falls back to the album's
                     coverImage in the UI if not set)
       lyrics        array of { time, text } — synchronized lyric lines,
                     unlimited length, unique per song
       documents     { word, pdf, ppt } download paths. A song does not
                     need every format — a missing key/path means the
                     public site shows "Not Available" instead of a
                     broken button (see updateDownloadPanel() in script.js)
       releaseDate   ISO date string
       isPublished   only published songs appear anywhere on the public
                     site (song list, search, album counts, player,
                     downloads)
       displayOrder  sort order within its album

     NOTE ON THE DEMO CONTENT BELOW:
     The actual project only ships with one placeholder audio file
     (assets/audio/demo-song.mp3) and no real per-song Word/PDF/PPT
     files yet — those folders currently only contain a README.txt each.
     buildDemoSongs() below generates realistic *placeholder* entries
     (title, language, 4-line synced lyrics, document paths) for every
     album so the site has something real to render and test against.
     When the Admin Dashboard exists, this generated array is exactly
     what dashboard-created songs will look like — the dashboard just
     replaces this generator with real, individually-entered songs.
     ======================================================================== */

  const SONG_TITLES = [
    "Karthar Yen Melpar", "Nandriha Iraiva", "Umathu Kirubai", "Jeya Vaazhthi",
    "Kartharer Gembiramal", "Vanakkil Vanangugiren", "Visuvasam", "Yesuvea Adalaalam",
    "Uyirthuththa Thevanai", "Annbaan Thevane", "Sthothiram Yesuvea", "Aaraadhanai Aavene",
    "Iraiva Nee Peridam", "Sthuthi Paadal", "Vaanam Bhoomiyum", "Naan Unnai Thuthipen",
    "Iraiva En Jeevan", "Anbin Thagappane", "Iraiva Aandavarae", "Yen Iravukalin Nadhaney",
    "Karunai Deivame", "Malayil Vaazhum Deivam", "Sabai Kootiya Neram", "Un Sannidhiyil",
    "Yen Aviyum Unnai", "Sthothira Geetham", "Deivathin Sannidhi", "Anbulla Iraiva",
    "Iravukku Nadhaney", "Iraiva Yen Nesa", "Vaana Vaazhvin Nadhaney", "Un Anbil Vaazhven",
    "Sthuthi Sthuthi Yesuvea", "Iraiva En Balam", "Jeevan Tharum Deivam", "Kirubaiyin Deivam",
    "Iraiva Aaradanai", "Yen Nadhaney Vaa", "Sabai Padum Geetham", "Deiva Snegam",
    "Yen Iraiva Vaa", "Anbin Sunaiyae", "Sthothirangal Yesuvea", "Karunaiyin Nadhaney",
    "Iraiva Vaazhthu", "Un Naamathil", "Deiva Aaseervadham", "Yen Iravu Pahal",
    "Sthothira Balipeedam", "Iraiva Sthothiram", "Vaanavarudan Paadalgal", "Jeevanin Nadhaney",
    "Anbin Karangal", "Sthothiram Sthothiram", "Iraiva Un Sannidhi", "Deivathin Anbu",
    "Naan Paadum Geetham", "Sabai Ondru Serndhu", "Yesuvin Anbu", "Sthothira Naadagam"
  ];

  const ARTIST_NAME = "Iraiva Ministries";

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  function buildDemoSongs() {
    // Only released albums get demo songs — a coming-soon album has no
    // songs yet, which is expected/normal.
    const perAlbum = { "album-001": 9, "album-002": 11, "album-003": 9, "album-004": 9, "album-005": 10, "album-006": 9 };
    const list = [];
    let globalIndex = 0;
    let songNum = 1;

    Object.keys(perAlbum).forEach((albumId) => {
      const album = ALBUMS.find((a) => a.id === albumId);
      const count = perAlbum[albumId];

      for (let track = 1; track <= count; track++) {
        const title = SONG_TITLES[(songNum - 1) % SONG_TITLES.length];
        const id = `song-${pad3(songNum)}`;
        // Deterministic language spread, same distribution as the
        // original demo data (mostly Tamil, a few other languages).
        const language = globalIndex % 9 === 0 ? "English"
          : globalIndex % 13 === 0 ? "Telugu"
          : globalIndex % 17 === 0 ? "Malayalam"
          : "Tamil";

        list.push({
          id,
          albumId,
          trackNumber: track,
          title,
          slug: slugify(`${title}-${songNum}`),
          artist: ARTIST_NAME,
          language,
          duration: 240,
          audioFile: "assets/audio/demo-song.mp3",
          coverImage: album ? album.coverImage : null,

          /* Synchronized lyrics — { time (seconds), text }. Unlimited
             lines supported; STEP 2's sync logic reads this untouched. */
          lyrics: [
            { time: 0, text: `${title} endral unthal selvam peruven` },
            { time: 6, text: "En jeevan neyarae nee than en balam" },
            { time: 12, text: "Un anbile naan vaazhven endrum naan paaduven" },
            { time: 18, text: "Alleluia alleluia endru thuthipen" }
          ],

          documents: {
            word: `assets/documents/word/song-${songNum}.docx`,
            pdf: `assets/documents/pdf/song-${songNum}.pdf`,
            ppt: `assets/documents/ppt/song-${songNum}.pptx`
          },

          releaseDate: album ? album.releaseDate : null,
          isPublished: true,
          displayOrder: track
        });

        songNum++;
        globalIndex++;
      }
    });

    return list;
  }

  const SONGS = buildDemoSongs();

  /* ========================================================================
     4B. ADMIN DASHBOARD BRIDGE (localStorage)
     ------------------------------------------------------------------------
     The Admin Dashboard (admin/albums-data.js, admin/songs-data.js) is the
     live source of truth for content once it has been opened: it seeds its
     own localStorage records ("iraivaAdmin.albums.v1" / "iraivaAdmin.songs.v1")
     from the demo arrays above the first time it loads, then every
     add/edit/publish/delete is written back to those same keys.

     Previously the public site never looked at those keys, so it kept
     rendering only the static ALBUMS/SONGS above no matter what the admin
     dashboard did. getAlbums()/getSongs() below now read the SAME keys the
     admin dashboard uses, so both sides of the app share one source of
     truth without introducing any new storage mechanism, backend, or
     build step. If the admin dashboard has never been opened (no stored
     record yet), the site simply falls back to the static demo content
     below, exactly as before.
     ======================================================================== */
  const ALBUMS_STORAGE_KEY = "iraivaAdmin.albums.v1";
  const SONGS_STORAGE_KEY = "iraivaAdmin.songs.v1";

  /* ========================================================================
     4C. AUDIO BLOB STORAGE (IndexedDB)
     ------------------------------------------------------------------------
     Song metadata (title, lyrics, documents, audioFile marker) stays in
     the existing localStorage-backed "iraivaAdmin.songs.v1" record — that
     part already works and is untouched. Only the raw uploaded MP3 itself
     moves here: localStorage has a ~5-10MB total quota, which a single
     base64 audio file can blow past on its own; IndexedDB does not share
     that limit and is built for binary data. Each song's audio is stored
     as one Blob, keyed by that song's id — one song's audio can never
     collide with another's. A song record marks that it uses this store
     by setting its audioFile field to "indexeddb:<songId>" instead of a
     data: URL; anything else in audioFile (a real path, http(s) URL, or a
     legacy pre-migration data: URL) is left exactly as before.
     ======================================================================== */
  const AUDIO_DB_NAME = "iraivaAudioDB";
  const AUDIO_DB_VERSION = 1;
  const AUDIO_STORE = "audioFiles";

  function openAudioDB() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error("IndexedDB not supported")); return; }
      const req = global.indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function saveAudioBlob(songId, blob) {
    const db = await openAudioDB();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).put(blob, songId);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  async function getAudioBlob(songId) {
    const db = await openAudioDB();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const req = tx.objectStore(AUDIO_STORE).get(songId);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function deleteAudioBlob(songId) {
    const db = await openAudioDB();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).delete(songId);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function readAdminStorage(key) {
    try {
      const raw = global.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  /* ========================================================================
     5. HELPER / COMPUTED-VALUE FUNCTIONS
     These keep the site from ever storing the same fact in two places.
     ======================================================================== */

  function getAlbumById(albums, albumId) {
    return albums.find((a) => a.id === albumId) || null;
  }

  function getSongById(songs, songId) {
    return songs.find((s) => s.id === songId) || null;
  }

  function getSongsByAlbum(songs, albumId) {
    return songs.filter((s) => s.albumId === albumId);
  }

  /* Section 13 — album song counts are always CALCULATED, never manually
     duplicated. Only published songs count. */
  function getAlbumSongCount(songs, albumId) {
    return songs.filter((s) => s.albumId === albumId && s.isPublished).length;
  }

  /* Section 14 — publication filtering. */
  function getPublishedAlbums(albums) {
    return albums.filter((a) => a.isPublished);
  }
  function getPublishedSongs(songs) {
    return songs.filter((s) => s.isPublished);
  }

  /* Section 15 — homepage statistics, calculated from live data. */
  function computeStats(albums, songs, languages) {
    const publishedSongs = getPublishedSongs(songs);
    const releasedAlbums = getPublishedAlbums(albums).filter((a) => a.status === "released");
    const usedLanguages = new Set(publishedSongs.map((s) => s.language).filter(Boolean));
    return {
      totalSongs: publishedSongs.length,
      releasedAlbumCount: releasedAlbums.length,
      languageCount: usedLanguages.size || languages.length,
      lyricsFocusedPercent: 100
    };
  }

  /* ========================================================================
     6. FUTURE-API-READY ACCESSORS
     ------------------------------------------------------------------------
     script.js only ever talks to the data layer through these three
     functions. They are async on purpose — right now they just resolve
     with the local arrays, but later they can become:

         async function getAlbums() {
           const res = await fetch("/api/albums");
           return res.json();
         }

     without any other file needing to change.
     ======================================================================== */
  async function getAlbums() {
    const stored = readAdminStorage(ALBUMS_STORAGE_KEY);
    return stored || ALBUMS;
  }

  async function getSongs() {
    const stored = readAdminStorage(SONGS_STORAGE_KEY);
    return stored || SONGS;
  }

  async function getLanguages() {
    return LANGUAGES;
  }

  async function getMinistries() {
    return MINISTRIES;
  }

  /* Expose a single namespaced object so nothing here pollutes globals
     beyond one name. */
  global.IraivaData = {
    getAlbums,
    getSongs,
    getLanguages,
    getMinistries,
    getAlbumById,
    getSongById,
    getSongsByAlbum,
    getAlbumSongCount,
    getPublishedAlbums,
    getPublishedSongs,
    computeStats,
    // 4C — audio blob storage (IndexedDB), shared by admin + public site
    saveAudioBlob,
    getAudioBlob,
    deleteAudioBlob
  };
})(window);