# Iraiva Ministries — Lyrics Library

A simple, static **HTML5 + CSS3 + Vanilla JavaScript** website. No build step,
no frameworks — download the folder and open `index.html` in a browser, or
serve it with any static file server.

## How to open the website

Just open `index.html` in a browser. For the best experience (audio,
downloads, fonts) serve it over a local web server instead of the `file://`
protocol, for example:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Content-driven architecture

All album/song/lyrics/document content lives in **one file**:

```
assets/js/data.js
```

`script.js` never hard-codes song or album information — it only ever asks
`assets/js/data.js` for content, through:

- `IraivaData.getAlbums()`
- `IraivaData.getSongs()`
- `IraivaData.getLanguages()`
- `IraivaData.getMinistries()`

These are `async` functions on purpose. Right now they just return the local
arrays defined in `data.js`, but later — once an Admin Dashboard and backend
exist — they can be swapped for real API calls (e.g. `fetch("/api/albums")`)
**without changing anything else in the project.**

### Where the demo data lives

`assets/js/data.js` currently ships with:

- 7 albums (Iraiva 1–6 released, Iraiva 7 marked `coming-soon`)
- 57 demo songs spread across the 6 released albums, each with 4 lines of
  placeholder synchronized lyrics and demo document paths

This is placeholder content for testing the site. When the Admin Dashboard
is built, it will manage real albums/songs that replace this data — the
shape (fields) stays exactly the same.

### Data model summary

**Album**: `id, albumNumber, name, slug, coverImage, releaseYear, releaseDate, description, status, songCount, displayOrder, isPublished`

**Song**: `id, albumId, trackNumber, title, slug, artist, language, duration, audioFile, coverImage, lyrics, documents, releaseDate, isPublished, displayOrder`

- `status` can be `released`, `coming-soon`, or `draft`.
- `isPublished: false` hides an album or song everywhere on the public site
  (song list, search, album counts, player, downloads).
- Album song counts are **never** stored twice — they're calculated live
  from the songs belonging to that album (`IraivaData.getAlbumSongCount`).
- The site is **not** limited to a fixed number of albums. Add `album-008`,
  `album-009`, etc. to the `ALBUMS` array in `data.js` and the slider, the
  filter tabs and the homepage stats will pick it up automatically.

### Synchronized lyrics

Each song's `lyrics` field is an array of timed lines:

```js
lyrics: [
  { time: 0,  text: "First lyric line" },
  { time: 6,  text: "Second lyric line" },
  { time: 12, text: "Third lyric line" }
]
```

`time` is the number of seconds into the audio file when that line becomes
active. The player watches `audio.currentTime` and highlights the matching
line automatically (Spotify-style). Clicking a lyric line seeks the audio to
that timestamp. There's no separate copy of the lyrics anywhere else in the
code — the player always reads `currentSong.lyrics` directly.

### Downloadable documents

Each song has a `documents` object:

```js
documents: {
  word: "assets/documents/word/song-1.docx",
  pdf:  "assets/documents/pdf/song-1.pdf",
  ppt:  "assets/documents/ppt/song-1.pptx"
}
```

A song doesn't need every format. If a key is missing (or the file doesn't
actually exist yet), the corresponding download button is automatically
disabled and shows **"Not Available"** instead of a broken link.

## Where to replace things

| What | Where |
|---|---|
| Logo | `assets/images/iraiva-logo.webp` |
| Hero background video | `assets/videos/hero-background.mp4` |
| Hero poster image | `assets/images/hero-poster.webp` |
| Album cover art | `assets/images/album-*.webp` (referenced by `coverImage` in `data.js`) |
| Song audio | `assets/audio/` (referenced by `audioFile` in `data.js`) |
| Word / PDF / PPT downloads | `assets/documents/word/`, `assets/documents/pdf/`, `assets/documents/ppt/` (referenced by `documents` in `data.js`) |
| Album & song content | `assets/js/data.js` |

## What's next

This is **not** the Admin Dashboard. It's the data-driven public website the
dashboard will eventually connect to and manage. The next phase adds the
dashboard, authentication, and a real backend/database behind
`getAlbums()` / `getSongs()` / `getLanguages()`.
