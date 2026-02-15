/* ─────────────────────────────────────────────────────────
   auth.js  —  Auth guard, token refresh, logout, and
               authenticated fetch wrapper.
               Include this on every PROTECTED page,
               BEFORE common.js and page-specific scripts.
   ───────────────────────────────────────────────────────── */

(function () {
    "use strict";

    const LOGIN_URL = "/html/login.html";

    /* ──────────────────────────────────────────────────────
       Auth Guard — redirect to login if no valid token
       ────────────────────────────────────────────────────── */

    function getAccessToken() {
        return sessionStorage.getItem("access_token");
    }

    // Immediately check — if no token, go to login
    if (!getAccessToken()) {
        window.location.replace(LOGIN_URL);
        // Stop script execution on this page
        throw new Error("AUTH_REDIRECT");
    }

    /* ──────────────────────────────────────────────────────
       Token Refresh — silent refresh via httpOnly cookie
       ────────────────────────────────────────────────────── */

    let isRefreshing = false;
    let refreshQueue = []; // callbacks waiting for the refresh

    /**
     * Attempt to refresh the access token using the refresh
     * cookie.  Returns the new access token on success, or
     * null on failure (which triggers a logout).
     */
    async function refreshAccessToken() {
        try {
            const res = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                return null;
            }

            const data = await res.json();
            sessionStorage.setItem("access_token", data.accessToken);
            return data.accessToken;
        } catch {
            return null;
        }
    }

    /**
     * Coordinate refresh: only one refresh request at a time.
     * Other callers queue up and receive the result.
     */
    function coordinatedRefresh() {
        if (isRefreshing) {
            return new Promise((resolve) => {
                refreshQueue.push(resolve);
            });
        }

        isRefreshing = true;

        return refreshAccessToken().then((token) => {
            isRefreshing = false;
            refreshQueue.forEach((cb) => cb(token));
            refreshQueue = [];
            return token;
        });
    }

    /* ──────────────────────────────────────────────────────
       authFetch — drop-in replacement for fetch() that
       automatically attaches the Authorization header and
       retries once on 401 (transparent token refresh).
       ────────────────────────────────────────────────────── */

    async function authFetch(url, options = {}) {
        const token = getAccessToken();

        // Merge headers
        const headers = new Headers(options.headers || {});
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const res = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
        });

        // If 401, try refreshing once
        if (res.status === 401) {
            const newToken = await coordinatedRefresh();

            if (!newToken) {
                // Refresh also failed — force logout
                logout();
                return res; // return original so callers can handle
            }

            // Retry with new token
            headers.set("Authorization", `Bearer ${newToken}`);
            return fetch(url, { ...options, headers, credentials: "include" });
        }

        return res;
    }

    // Expose globally so common.js and page scripts can use it
    window.authFetch = authFetch;

    /* ──────────────────────────────────────────────────────
       Logout
       ────────────────────────────────────────────────────── */

    async function logout() {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // ignore — we're logging out anyway
        }

        sessionStorage.removeItem("access_token");
        window.location.replace(LOGIN_URL);
    }

    // Expose globally for the nav logout button
    window.logout = logout;

    /* ──────────────────────────────────────────────────────
       Proactive refresh — refresh 2 minutes before expiry
       ────────────────────────────────────────────────────── */

    function scheduleProactiveRefresh() {
        const token = getAccessToken();
        if (!token) return;

        try {
            // Decode payload (no verification on client side)
            const payload = JSON.parse(atob(token.split(".")[1]));
            const expiresAt = payload.exp * 1000;
            const now = Date.now();
            const refreshIn = expiresAt - now - 2 * 60 * 1000; // 2 min before expiry

            if (refreshIn > 0) {
                setTimeout(async () => {
                    const newToken = await coordinatedRefresh();
                    if (newToken) {
                        scheduleProactiveRefresh();
                    }
                }, refreshIn);
            } else {
                // Token is about to expire or already expired — refresh now
                coordinatedRefresh().then((t) => {
                    if (t) scheduleProactiveRefresh();
                });
            }
        } catch {
            // can't parse token — will be caught on next API call
        }
    }

    scheduleProactiveRefresh();
})();
