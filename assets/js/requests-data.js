/* ==========================================================================
   IRAIVA MINISTRIES
   assets/js/requests-data.js

   STEP 4B6 SCOPE ONLY — SONG REQUEST DATA LAYER
   --------------------------------------------------------------------------
   Shared, isolated data layer for the "Request a Song" feature. Loaded by
   BOTH the public website (index.html, via the Request Song modal) and the
   admin Song Requests page (admin/requests.html). Kept completely separate
   from assets/js/data.js (albums/songs) and the admin/*-data.js files, so
   this step cannot affect Albums, Songs, or Documents management.

   Persisted to localStorage (shared across same-origin pages, so a request
   submitted on the public site immediately shows up in the admin panel and
   survives a page refresh).

   Public API (window.IraivaRequestsData):
     getRequests()        -> Promise<Array<request>>
     createRequest(input)  -> Promise<request>
     updateRequest(id, changes) -> Promise<request>
     deleteRequest(id)    -> Promise<boolean>
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "iraivaRequests.v1";
  const VALID_STATUSES = ["pending", "completed"];

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

  function writeStorage(requests) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (err) {
      // localStorage may be unavailable (private mode / quota) — keep working
      // in-memory via `cache` for this tab.
      console.warn("IraivaRequestsData: could not persist to localStorage.", err);
    }
  }

  function ensureLoaded() {
    if (cache) return cache;
    const stored = readStorage();
    cache = Array.isArray(stored) ? stored : [];
    return cache;
  }

  /* ---------- id helper ---------- */

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  function nextId(requests) {
    let max = 0;
    requests.forEach(function (r) {
      const match = /(\d+)$/.exec(String(r.id || ""));
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return "req-" + pad3(max + 1);
  }

  /* ---------- public read operations ---------- */

  async function getRequests() {
    const requests = ensureLoaded();
    return requests.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  async function getRequestById(id) {
    const requests = ensureLoaded();
    return requests.find(function (r) { return r.id === id; }) || null;
  }

  /* ---------- public write operations ---------- */

  async function createRequest(input) {
    const requests = ensureLoaded();
    const record = {
      id: nextId(requests),
      name: (input.name && String(input.name).trim()) || "Website Visitor",
      email: (input.email && String(input.email).trim()) || "",
      song: String(input.song || "").trim(),
      message: (input.message && String(input.message).trim()) || "",
      createdAt: new Date().toISOString(),
      status: "pending"
    };
    requests.push(record);
    writeStorage(requests);
    return record;
  }

  async function updateRequest(id, changes) {
    const requests = ensureLoaded();
    const idx = requests.findIndex(function (r) { return r.id === id; });
    if (idx === -1) throw new Error("Request not found: " + id);

    const updated = Object.assign({}, requests[idx], changes);
    if (changes.status && VALID_STATUSES.indexOf(changes.status) === -1) {
      throw new Error("Invalid status: " + changes.status);
    }
    requests[idx] = updated;
    writeStorage(requests);
    return updated;
  }

  async function deleteRequest(id) {
    const requests = ensureLoaded();
    const idx = requests.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return false;
    requests.splice(idx, 1);
    writeStorage(requests);
    return true;
  }

  global.IraivaRequestsData = {
    getRequests: getRequests,
    getRequestById: getRequestById,
    createRequest: createRequest,
    updateRequest: updateRequest,
    deleteRequest: deleteRequest,
    VALID_STATUSES: VALID_STATUSES
  };
})(window);
