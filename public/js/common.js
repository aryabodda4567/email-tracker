/* ─────────────────────────────────────────────────────────
   common.js  —  Shared helpers for Email Tracker UI
   ───────────────────────────────────────────────────────── */

/**
 * Convert a Firebase Timestamp (or ISO string / Date) into a
 * human-readable string.
 *
 * Handles:
 *   - Firestore Timestamp objects  { _seconds, _nanoseconds }
 *   - Plain objects                { seconds, nanoseconds }
 *   - ISO 8601 strings
 *   - JS Date instances
 *   - null / undefined → returns fallback string
 *
 * @param  {*}      ts        The timestamp value
 * @param  {string} fallback  Text to show when ts is empty
 * @return {string}           e.g. "13 Feb 2026, 06:30:15 PM"
 */
function formatTimestamp(ts, fallback = "—") {
    if (!ts) return fallback;

    let date;

    // Firestore Timestamp object  { _seconds, _nanoseconds }
    if (typeof ts === "object" && (ts._seconds !== undefined || ts.seconds !== undefined)) {
        const secs = ts._seconds ?? ts.seconds;
        date = new Date(secs * 1000);
    }
    // ISO string or anything Date() can parse
    else if (typeof ts === "string" || typeof ts === "number") {
        date = new Date(ts);
    }
    // Already a Date
    else if (ts instanceof Date) {
        date = ts;
    }
    else {
        return fallback;
    }

    if (isNaN(date.getTime())) return fallback;

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    let hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, "0");
    const secs = date.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${day} ${month} ${year}, ${hours}:${mins}:${secs} ${ampm}`;
}

/**
 * Thin fetch wrapper that returns parsed JSON.
 * Throws on non-2xx responses with the error message from the API.
 *
 * @param  {string} url
 * @return {Promise<any>}
 */
async function fetchJSON(url, options = {}) {
    // Use authFetch if available (loaded by auth.js on protected pages)
    const fetchFn = window.authFetch || fetch;
    const res = await fetchFn(url, options);

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }

    return res.json();
}

/**
 * Thin POST wrapper using authFetch.
 * @param  {string} url
 * @param  {Object} body
 * @return {Promise<any>}
 */
async function postJSON(url, body) {
    return fetchJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

/**
 * Show a loading spinner inside an element.
 * @param {HTMLElement} el
 */
function showLoading(el) {
    el.innerHTML = '<div class="loading">Loading…</div>';
}

/**
 * Show an error message inside an element.
 * @param {HTMLElement} el
 * @param {string}      msg
 */
function showError(el, msg) {
    el.innerHTML = `<div class="error-msg">${msg}</div>`;
}
