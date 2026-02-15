require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./auth/authRoutes");
const { requireAuth } = require("./auth/authMiddleware");
const emailRoutes = require("./email/emailRoutes");

const app = express();

/* ──────────────────────────────────────────────────────────
   Security Headers (OWASP A05)
   ────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");
    // Prevent MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // XSS filter (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");
    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Permissions policy
    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
    // HSTS (only in production over HTTPS)
    if (process.env.NODE_ENV === "production") {
        res.setHeader(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        );
    }
    // Content Security Policy
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    );

    next();
});

/* ──────────────────────────────────────────────────────────
   CORS — tightened (OWASP A08)
   ────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        process.env.BASE_URL,
        `http://localhost:${process.env.PORT || 3000}`,
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    next();
});

/* ──────────────────────────────────────────────────────────
   Body parsers
   ────────────────────────────────────────────────────────── */
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/* ──────────────────────────────────────────────────────────
   Public routes  (no auth required)
   ────────────────────────────────────────────────────────── */

// Auth endpoints (login, refresh, logout)
app.use(authRoutes);

// Serve static files (css, js, html) — login page is here
app.use(express.static("public"));

// Tracking pixel — must stay public for email clients
const { handleTrackingPixel } = require("./track/trackingRoutes");
app.get("/track/:id", handleTrackingPixel);

// Redirect root to login (will auto-redirect to dashboard if logged in)
app.get("/", (req, res) => res.redirect("/html/login.html"));

/* ──────────────────────────────────────────────────────────
   Protected routes  (JWT required)
   ────────────────────────────────────────────────────────── */
const { analyticsRouter } = require("./track/trackingRoutes");
app.use(requireAuth, analyticsRouter);
app.use(requireAuth, emailRoutes);

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
