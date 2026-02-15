/* ─────────────────────────────────────────────────────────
   authRoutes.js  —  Login, refresh & logout endpoints
   ───────────────────────────────────────────────────────── */

const express = require("express");
const router = express.Router();

const {
    verifyCredentials,
    generateAccessToken,
    generateRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
} = require("./authService");

const { loginRateLimiter } = require("./authMiddleware");

// ── Cookie config ─────────────────────────────────────────
const REFRESH_COOKIE_NAME = "refresh_token";
const isProduction = process.env.NODE_ENV === "production";

function refreshCookieOptions() {
    return {
        httpOnly: true,                       // JS can't read it (XSS protection)
        secure: isProduction,                 // HTTPS-only in production
        sameSite: isProduction ? "Strict" : "Lax", // CSRF protection
        path: "/api/auth",                    // only sent to auth endpoints
        maxAge: 7 * 24 * 60 * 60 * 1000,     // 7 days
    };
}

/* ──────────────────────────────────────────────────────────
   POST /api/auth/login
   ────────────────────────────────────────────────────────── */

/**
 * Authenticate with username + password.
 * Returns access token in JSON body.
 * Sets refresh token as httpOnly cookie.
 *
 * Rate-limited to 5 attempts per 15 min per IP (OWASP A07).
 */
router.post("/api/auth/login", loginRateLimiter, (req, res) => {
    try {
        const { username, password } = req.body;

        // ── Input validation (OWASP A03) ──────────────
        if (!username || !password) {
            return res.status(400).json({
                error: "Username and password are required",
            });
        }

        if (
            typeof username !== "string" || typeof password !== "string" ||
            username.length > 128 || password.length > 256
        ) {
            return res.status(400).json({ error: "Invalid input" });
        }

        // ── Credential check ──────────────────────────
        if (!verifyCredentials(username, password)) {
            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.connection?.remoteAddress ||
                "unknown";

            console.warn(
                `[SECURITY] Failed login attempt for user "${username}" from IP ${ip}`
            );

            // Generic message — no credential leakage (OWASP A07)
            return res.status(401).json({
                error: "Invalid username or password",
            });
        }

        // ── Issue tokens ──────────────────────────────
        const accessToken = generateAccessToken(username);
        const refreshToken = generateRefreshToken(username);

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

        return res.status(200).json({
            accessToken,
            expiresIn: 900, // 15 minutes in seconds
        });
    } catch (error) {
        console.error("[AUTH] Login error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/* ──────────────────────────────────────────────────────────
   POST /api/auth/refresh
   ────────────────────────────────────────────────────────── */

/**
 * Rotate refresh token and issue a new access token.
 * Reads the refresh token from the httpOnly cookie.
 */
router.post("/api/auth/refresh", (req, res) => {
    try {
        const oldRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

        if (!oldRefreshToken) {
            return res.status(401).json({ error: "No refresh token provided" });
        }

        const result = rotateRefreshToken(oldRefreshToken);

        if (!result) {
            // Clear the invalid cookie
            res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }

        // Set new refresh token cookie
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

        return res.status(200).json({
            accessToken: result.accessToken,
            expiresIn: 900,
        });
    } catch (error) {
        console.error("[AUTH] Refresh error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/* ──────────────────────────────────────────────────────────
   POST /api/auth/logout
   ────────────────────────────────────────────────────────── */

/**
 * Revoke the refresh token and clear the cookie.
 */
router.post("/api/auth/logout", (req, res) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

        if (refreshToken) {
            revokeRefreshToken(refreshToken);
        }

        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });

        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("[AUTH] Logout error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
