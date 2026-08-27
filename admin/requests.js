/* ==========================================================================
   IRAIVA MINISTRIES — ADMIN DASHBOARD
   admin/requests.js

   STEP 4B6 SCOPE ONLY — SONG REQUESTS MANAGEMENT (UI layer)
   --------------------------------------------------------------------------
   Reads/writes request data exclusively through window.IraivaRequestsData
   (assets/js/requests-data.js). Follows the same structure as albums.js /
   songs.js: DOM cache, render(), filter/search state, modal open/close,
   toasts. Does not touch Albums, Songs, or Documents in any way.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  let state = {
    requests: [],
    filter: "all",
    query: "",
    activeId: null,      // request currently open in the view modal
    pendingDeleteId: null
  };

  const dom = {};

  function init() {
    dom.tableBody = document.getElementById("requestsTableBody");
    dom.emptyState = document.getElementById("emptyState");
    dom.resultsMeta = document.getElementById("resultsMeta");
    dom.filterChips = document.getElementById("filterChips");
    dom.searchInput = document.getElementById("requestSearchInput");

    dom.viewModalOverlay = document.getElementById("viewModalOverlay");
    dom.viewModalCloseBtn = document.getElementById("viewModalCloseBtn");
    dom.viewCloseBtn = document.getElementById("viewCloseBtn");
    dom.viewCompleteBtn = document.getElementById("viewCompleteBtn");
    dom.requestDetailBody = document.getElementById("requestDetailBody");

    dom.deleteModalOverlay = document.getElementById("deleteModalOverlay");
    dom.deleteModalCloseBtn = document.getElementById("deleteModalCloseBtn");
    dom.deleteCancelBtn = document.getElementById("deleteCancelBtn");
    dom.deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
    dom.deleteRequestSong = document.getElementById("deleteRequestSong");

    dom.toastStack = document.getElementById("toastStack");

    dom.filterChips.addEventListener("click", onFilterClick);
    dom.searchInput.addEventListener("input", onSearchInput);

    dom.viewModalCloseBtn.addEventListener("click", closeViewModal);
    dom.viewCloseBtn.addEventListener("click", closeViewModal);
    dom.viewModalOverlay.addEventListener("click", function (e) {
      if (e.target === dom.viewModalOverlay) closeViewModal();
    });
    dom.viewCompleteBtn.addEventListener("click", onCompleteFromModal);

    dom.deleteModalCloseBtn.addEventListener("click", closeDeleteModal);
    dom.deleteCancelBtn.addEventListener("click", closeDeleteModal);
    dom.deleteModalOverlay.addEventListener("click", function (e) {
      if (e.target === dom.deleteModalOverlay) closeDeleteModal();
    });
    dom.deleteConfirmBtn.addEventListener("click", onConfirmDelete);

    document.addEventListener("keydown", function (evt) {
      if (evt.key !== "Escape") return;
      if (dom.deleteModalOverlay.classList.contains("open")) closeDeleteModal();
      else if (dom.viewModalOverlay.classList.contains("open")) closeViewModal();
    });

    loadAndRender();
  }

  /* ---------------------------------------------------------------------
     Load + render
     --------------------------------------------------------------------- */
  async function loadAndRender() {
    state.requests = await window.IraivaRequestsData.getRequests();
    render();
  }

  function render() {
    updateChipCounts();

    const filtered = state.requests.filter(matchesFilterAndSearch);

    dom.tableBody.innerHTML = filtered.map(renderRow).join("");
    dom.emptyState.hidden = filtered.length !== 0;
    dom.tableBody.parentElement.style.display = filtered.length === 0 ? "none" : "";

    dom.resultsMeta.textContent = filtered.length === 0
      ? ""
      : "Showing " + filtered.length + " of " + state.requests.length + " request" + (state.requests.length === 1 ? "" : "s");

    // wire row actions (re-bound each render since rows are re-created)
    dom.tableBody.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", onRowAction);
    });
  }

  function matchesFilterAndSearch(req) {
    if (state.filter !== "all" && req.status !== state.filter) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    return (
      (req.name || "").toLowerCase().indexOf(q) !== -1 ||
      (req.song || "").toLowerCase().indexOf(q) !== -1
    );
  }

  function updateChipCounts() {
    const all = state.requests.length;
    const pending = state.requests.filter(function (r) { return r.status === "pending"; }).length;
    const completed = state.requests.filter(function (r) { return r.status === "completed"; }).length;
    document.getElementById("count-all").textContent = all;
    document.getElementById("count-pending").textContent = pending;
    document.getElementById("count-completed").textContent = completed;
  }

  function renderRow(req) {
    const statusClass = req.status === "completed" ? "completed" : "review";
    const statusLabel = req.status === "completed" ? "Completed" : "Pending";
    const emailSub = req.email ? '<div class="cell-sub">' + escapeHtml(req.email) + "</div>" : "";

    return (
      "<tr>" +
      "<td>" + escapeHtml(req.name) + emailSub + "</td>" +
      '<td class="req-song-cell"><strong>' + escapeHtml(req.song) + "</strong></td>" +
      '<td><span class="status-badge ' + statusClass + '"><span class="status-dot"></span>' + statusLabel + "</span></td>" +
      "<td>" + formatDate(req.createdAt) + "</td>" +
      '<td><div class="row-actions">' +
      '<button class="btn-icon" type="button" data-action="view" data-id="' + req.id + '" aria-label="View request"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
      (req.status !== "completed"
        ? '<button class="btn-icon" type="button" data-action="complete" data-id="' + req.id + '" aria-label="Mark as completed"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>'
        : "") +
      '<button class="btn-icon danger" type="button" data-action="delete" data-id="' + req.id + '" aria-label="Delete request"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>' +
      "</div></td>" +
      "</tr>"
    );
  }

  /* ---------------------------------------------------------------------
     Filters + search
     --------------------------------------------------------------------- */
  function onFilterClick(e) {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    dom.filterChips.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
    chip.classList.add("active");
    state.filter = chip.getAttribute("data-filter");
    render();
  }

  function onSearchInput(e) {
    state.query = e.target.value.trim();
    render();
  }

  /* ---------------------------------------------------------------------
     Row actions
     --------------------------------------------------------------------- */
  function onRowAction(e) {
    const btn = e.currentTarget;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "view") openViewModal(id);
    else if (action === "complete") markCompleted(id);
    else if (action === "delete") openDeleteModal(id);
  }

  /* ---------------------------------------------------------------------
     View modal
     --------------------------------------------------------------------- */
  function openViewModal(id) {
    const req = state.requests.find(function (r) { return r.id === id; });
    if (!req) return;
    state.activeId = id;

    dom.requestDetailBody.innerHTML = [
      detailRow("Requester", req.name),
      detailRow("Email", req.email),
      detailRow("Requested Song", req.song),
      detailRow("Message", req.message),
      detailRow("Submitted", formatDateTime(req.createdAt)),
      detailRow("Status", req.status === "completed" ? "Completed" : "Pending")
    ].join("");

    dom.viewCompleteBtn.disabled = req.status === "completed";
    dom.viewCompleteBtn.textContent = req.status === "completed" ? "Already Completed" : "Mark as Completed";

    dom.viewModalOverlay.classList.add("open");
    document.body.classList.add("scroll-lock");
  }

  function detailRow(label, value) {
    const hasValue = value && String(value).trim();
    return (
      '<div class="request-detail-row">' +
      '<span class="rd-label">' + escapeHtml(label) + "</span>" +
      '<span class="rd-value' + (hasValue ? "" : " empty") + '">' +
      (hasValue ? escapeHtml(value) : "Not provided") +
      "</span></div>"
    );
  }

  function closeViewModal() {
    dom.viewModalOverlay.classList.remove("open");
    state.activeId = null;
    if (!dom.deleteModalOverlay.classList.contains("open")) {
      document.body.classList.remove("scroll-lock");
    }
  }

  async function onCompleteFromModal() {
    if (!state.activeId) return;
    await markCompleted(state.activeId);
    closeViewModal();
  }

  /* ---------------------------------------------------------------------
     Mark completed
     --------------------------------------------------------------------- */
  async function markCompleted(id) {
    try {
      await window.IraivaRequestsData.updateRequest(id, { status: "completed" });
      await loadAndRender();
      showToast("success", "Request marked as completed.");
    } catch (err) {
      showToast("error", "Could not update this request. Please try again.");
    }
  }

  /* ---------------------------------------------------------------------
     Delete modal
     --------------------------------------------------------------------- */
  function openDeleteModal(id) {
    const req = state.requests.find(function (r) { return r.id === id; });
    if (!req) return;
    state.pendingDeleteId = id;
    dom.deleteRequestSong.textContent = req.song || "this request";
    dom.deleteModalOverlay.classList.add("open");
    document.body.classList.add("scroll-lock");
  }

  function closeDeleteModal() {
    dom.deleteModalOverlay.classList.remove("open");
    state.pendingDeleteId = null;
    if (!dom.viewModalOverlay.classList.contains("open")) {
      document.body.classList.remove("scroll-lock");
    }
  }

  async function onConfirmDelete() {
    if (!state.pendingDeleteId) return;
    try {
      await window.IraivaRequestsData.deleteRequest(state.pendingDeleteId);
      closeDeleteModal();
      if (state.activeId === state.pendingDeleteId) closeViewModal();
      await loadAndRender();
      showToast("success", "Request deleted.");
    } catch (err) {
      showToast("error", "Could not delete this request. Please try again.");
    }
  }

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

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
