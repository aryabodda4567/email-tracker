/* ─────────────────────────────────────────────────────────
   authMiddleware.js  —  Express middleware for JWT auth
                         and login rate-limiting (OWASP A07)
   ───────────────────────────────────────────────────────── */

const { verifyAccessToken } = require("./authService");

/* ──────────────────────────────────────────────────────────
   requireAuth — Protect routes with JWT access token
   ────────────────────────────────────────────────────────── */

/**
 * Express middleware that requires a valid JWT access token.
 *
 * Checks `Authorization: Bearer <token>` header.
 * On success, attaches decoded payload to `req.user`.
 * On failure, returns 401 with a generic message (OWASP A07).
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = decoded;
    next();
}

/* ──────────────────────────────────────────────────────────
   loginRateLimiter — In-memory per-IP rate limiting
   ────────────────────────────────────────────────────────── */

const loginAttempts = new Map(); // ip → { count, firstAttempt }

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Cleanup stale entries every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of loginAttempts) {
        if (now - data.firstAttempt > WINDOW_MS) {
            loginAttempts.delete(ip);
        }
    }
}, 30 * 60 * 1000);

/**
 * Express middleware rate-limiter for login attempts.
 * Max 5 attempts per IP in a 15-minute window.
 * Returns 429 when exceeded (OWASP A07).
 */
function loginRateLimiter(req, res, next) {
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.connection?.remoteAddress ||
        "unknown";

    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return next();
    }

    // Window expired — reset
    if (now - record.firstAttempt > WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return next();
    }

    // Within window
    record.count++;

    if (record.count > MAX_ATTEMPTS) {
        const retryAfter = Math.ceil(
            (WINDOW_MS - (now - record.firstAttempt)) / 1000
        );

        console.warn(
            `[SECURITY] Rate limit exceeded for IP ${ip} — ${record.count} login attempts`
        );

        return res.status(429).json({
            error: "Too many login attempts. Please try again later.",
            retryAfter,
        });
    }

    next();
}

module.exports = { requireAuth, loginRateLimiter };
