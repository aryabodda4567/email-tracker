/* ─────────────────────────────────────────────────────────
   login.js  —  Login form logic
   ───────────────────────────────────────────────────────── */

(function () {
    "use strict";

    // If already logged in, go straight to dashboard
    const existingToken = sessionStorage.getItem("access_token");
    if (existingToken) {
        window.location.replace("/html/dashboard.html");
        return;
    }

    const form = document.getElementById("loginForm");
    const errorEl = document.getElementById("error");
    const loginBtn = document.getElementById("loginBtn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.style.display = "none";

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !password) {
            showError("Please enter both username and password.");
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "Signing in…";

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // send/receive cookies
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || "Login failed. Please try again.");

                if (res.status === 429) {
                    // Rate limited — show countdown
                    const retryAfter = data.retryAfter || 60;
                    showError(
                        `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`
                    );
                }

                return;
            }

            // ── Success — store access token & redirect ───
            sessionStorage.setItem("access_token", data.accessToken);
            window.location.replace("/html/dashboard.html");
        } catch (err) {
            showError("Network error. Please check your connection.");
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    });

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = "block";

        // Shake animation
        const card = document.querySelector(".login-card");
        card.classList.remove("shake");
        void card.offsetWidth; // force reflow
        card.classList.add("shake");
    }
})();
