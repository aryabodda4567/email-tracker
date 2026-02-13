const express = require("express");
const router = express.Router();
const {
  updateEmailOpen,
  getEmailAnalyticsMeta,
  getAllEmailAnalyticsMeta,
  getFullEmailAnalytics
} = require("../services/analyticsService");

// ─────────────────────────────────────────────────────────
//  Tracking Pixel Endpoint
// ─────────────────────────────────────────────────────────

/**
 * GET /track/:id
 *
 * Tracking-pixel endpoint embedded inside emails.
 * When the recipient's mail client loads this image the
 * server records an "open" event via updateEmailOpen().
 *
 * @param {string} req.params.id - Unique email tracking ID
 * @returns {Buffer} 1×1 transparent GIF (always, even on error)
 */
router.get("/track/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).send("Missing tracking ID");
    }

    const userAgent = req.headers["user-agent"] || "";
    const ip =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      "unknown";


    const isProxy =
      userAgent.includes("GoogleImageProxy") ||
      userAgent.includes("AppleWebKit") && userAgent.includes("Apple Mail");

    console.log("Track hit:", id);
    console.log("IP:", ip);
    console.log("User-Agent:", userAgent);
    console.log("Proxy detected:", isProxy);

    await updateEmailOpen(id, {
      userAgent: req.headers["user-agent"],
      ip: req.headers["x-forwarded-for"],
      isProxy: req.headers["user-agent"]?.includes("GoogleImageProxy")
    });


  } catch (error) {
    console.error("Tracking error:", error.message);
    // do NOT break pixel response
  }

  // Always return pixel (even if error happens)
  res.set({
    "Content-Type": "image/gif",
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store"
  });

  res.send(
    Buffer.from(
      "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
      "base64"
    )
  );
});

// ─────────────────────────────────────────────────────────
//  Analytics API Endpoints
// ─────────────────────────────────────────────────────────

/**
 * GET /analytics/email/:id
 *
 * Returns lightweight metadata for a single tracked email.
 * Does NOT include the full views sub-collection — use the
 * /analytics/email/:id/full endpoint for that.
 *
 * Uses: getEmailAnalyticsMeta(id)
 *
 * @param  {string} req.params.id - Unique email tracking ID
 * @returns {Object} JSON with id, sentTime, isOpened, firstOpen,
 *                   subject, totalViews, proxyViews, realViews
 *
 * @example
 *  GET /analytics/email/abc123
 *  → { id, sentTime, isOpened, firstOpen, subject, ... }
 */
router.get("/analytics/email/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getEmailAnalyticsMeta(id);

    if (!meta) {
      return res.status(404).json({ error: "Email analytics not found" });
    }

    return res.status(200).json(meta);
  } catch (error) {
    console.error("Error fetching email meta:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /analytics/emails
 *
 * Returns metadata of ALL tracked emails, ordered by latest
 * sentTime first.  This is a lightweight listing — no views
 * sub-collection data is included.
 *
 * Uses: getAllEmailAnalyticsMeta()
 *
 * @returns {Array<Object>} JSON array of email metadata objects,
 *          each containing id, subject, sentTime, viewsCount,
 *          isOpened, firstOpen
 *
 * @example
 *  GET /analytics/emails
 *  → [ { id, subject, sentTime, viewsCount, ... }, ... ]
 */
router.get("/analytics/emails", async (req, res) => {
  try {
    const emails = await getAllEmailAnalyticsMeta();

    return res.status(200).json(emails);
  } catch (error) {
    console.error("Error fetching all emails meta:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /analytics/email/:id/full
 *
 * Returns the COMPLETE analytics for a single email, including
 * every individual view event from the views sub-collection
 * (ordered oldest → newest).
 *
 * Uses: getFullEmailAnalytics(id)
 *
 * @param  {string} req.params.id - Unique email tracking ID
 * @returns {Object} JSON with id, subject, receiverEmail, sentTime,
 *                   mailSent, isOpened, firstOpen, viewsCount,
 *                   and views[] (each entry has a time field)
 *
 * @example
 *  GET /analytics/email/abc123/full
 *  → { id, subject, receiverEmail, ..., views: [{ time }, ...] }
 */
router.get("/analytics/email/:id/full", async (req, res) => {
  try {
    const { id } = req.params;

    const analytics = await getFullEmailAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ error: "Email analytics not found" });
    }

    return res.status(200).json(analytics);
  } catch (error) {
    console.error("Error fetching full analytics:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────
//  Debug / Test Routes
// ─────────────────────────────────────────────────────────

/** GET /image — returns a simple SVG for manual testing */
router.get("/image", (req, res) => {
  res.set("Content-Type", "image/svg+xml");
  res.send(`
    <svg width="300" height="100">
      <rect width="300" height="100" fill="blue"/>
      <text x="20" y="60" fill="white" font-size="20">
        Hello From Server Image
      </text>
    </svg>
  `);
});

module.exports = router;

