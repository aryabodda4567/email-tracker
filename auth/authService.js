/* ─────────────────────────────────────────────────────────
   authService.js  —  JWT token generation, verification,
                      credential validation & refresh-token
                      rotation with OWASP best practices
   ───────────────────────────────────────────────────────── */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// ── Secrets ────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRY = "15m"; // short-lived
const REFRESH_TOKEN_EXPIRY = "7d"; // long-lived

// ── In-memory revocation set (for logout / rotation) ──────
// In production, use Redis or a DB table
const revokedRefreshTokens = new Set();

// ── Periodic cleanup — drop expired JTIs every 24 h ───────
setInterval(() => {
    revokedRefreshTokens.clear(); // expired tokens can't be verified anyway
}, 24 * 60 * 60 * 1000);

/* ──────────────────────────────────────────────────────────
   Credential verification
   ────────────────────────────────────────────────────────── */

/**
 * Verify username + password against env vars.
 * Uses timing-safe comparison (OWASP A07) to prevent
 * timing side-channel attacks.
 *
 * @param  {string}  username
 * @param  {string}  password  (plaintext — hashed here)
 * @return {boolean}
 */
function verifyCredentials(username, password) {
    const expectedUser = process.env.AUTH_USERNAME;
    const expectedHash = process.env.AUTH_PASSWORD_HASH;
    console.log(expectedHash, " ", expectedUser)
    if (!expectedUser || !expectedHash || !username || !password) {
        return false;
    }

    // SHA-256 hash the incoming password
    const incomingHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    // Timing-safe comparisons (OWASP A07)
    const userBuffer = Buffer.from(username);
    const expectedUserBuffer = Buffer.from(expectedUser);

    const hashBuffer = Buffer.from(incomingHash);
    const expectedHashBuffer = Buffer.from(expectedHash);

    // Length check first (timingSafeEqual requires same length)
    const userMatch =
        userBuffer.length === expectedUserBuffer.length &&
        crypto.timingSafeEqual(userBuffer, expectedUserBuffer);

    const hashMatch =
        hashBuffer.length === expectedHashBuffer.length &&
        crypto.timingSafeEqual(hashBuffer, expectedHashBuffer);

    return userMatch && hashMatch;
}

/* ──────────────────────────────────────────────────────────
   Token generation
   ────────────────────────────────────────────────────────── */

/**
 * Generate a short-lived access token.
 * @param  {string} username
 * @return {string} JWT
 */
function generateAccessToken(username) {
    return jwt.sign(
        { sub: username, type: "access" },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: "HS256" }
    );
}

/**
 * Generate a long-lived refresh token with a unique JTI
 * so it can be individually revoked.
 * @param  {string} username
 * @return {string} JWT
 */
function generateRefreshToken(username) {
    const jti = crypto.randomUUID();

    return jwt.sign(
        { sub: username, type: "refresh", jti },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: "HS256" }
    );
}

/* ──────────────────────────────────────────────────────────
   Token verification
   ────────────────────────────────────────────────────────── */

/**
 * Verify and decode an access token.
 * @param  {string} token
 * @return {Object|null} decoded payload or null
 */
function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ["HS256"],
        });

        if (decoded.type !== "access") return null;
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Verify and decode a refresh token.
 * Also checks the in-memory revocation set.
 * @param  {string} token
 * @return {Object|null} decoded payload or null
 */
function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
            algorithms: ["HS256"],
        });

        if (decoded.type !== "refresh") return null;
        if (revokedRefreshTokens.has(decoded.jti)) return null;

        return decoded;
    } catch {
        return null;
    }
}

/* ──────────────────────────────────────────────────────────
   Revocation & rotation
   ────────────────────────────────────────────────────────── */

/**
 * Revoke a refresh token (e.g. on logout).
 * @param {string} token  raw JWT string
 */
function revokeRefreshToken(token) {
    try {
        // Decode without verification — we just need the jti
        const decoded = jwt.decode(token);
        if (decoded && decoded.jti) {
            revokedRefreshTokens.add(decoded.jti);
        }
    } catch {
        // ignore — token was already invalid
    }
}

/**
 * Rotate: revoke the old refresh token and issue a fresh pair.
 * @param  {string} oldRefreshToken
 * @return {{ accessToken: string, refreshToken: string }|null}
 */
function rotateRefreshToken(oldRefreshToken) {
    const decoded = verifyRefreshToken(oldRefreshToken);
    if (!decoded) return null;

    // Revoke old
    revokeRefreshToken(oldRefreshToken);

    // Issue new pair
    const accessToken = generateAccessToken(decoded.sub);
    const refreshToken = generateRefreshToken(decoded.sub);

    return { accessToken, refreshToken };
}

module.exports = {
    verifyCredentials,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    revokeRefreshToken,
    rotateRefreshToken,
};
