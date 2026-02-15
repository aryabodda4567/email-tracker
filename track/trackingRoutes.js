const express = require("express");
const {
  updateEmailOpen,
  getEmailAnalyticsMeta,
  getAllEmailAnalyticsMeta,
  getFullEmailAnalytics
} = require("../services/analyticsService");

// ─────────────────────────────────────────────────────────
//  Tracking Pixel Handler (PUBLIC — no auth required)
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
async function handleTrackingPixel(req, res) {
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
}

// ─────────────────────────────────────────────────────────
//  Analytics API Router (PROTECTED — JWT auth required)
// ─────────────────────────────────────────────────────────

const analyticsRouter = express.Router();

/**
 * GET /analytics/email/:id
 *
 * Returns lightweight metadata for a single tracked email.
 */
analyticsRouter.get("/analytics/email/:id", async (req, res) => {
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
 * sentTime first.
 */
analyticsRouter.get("/analytics/emails", async (req, res) => {
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
 * every individual view event from the views sub-collection.
 */
analyticsRouter.get("/analytics/email/:id/full", async (req, res) => {
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
analyticsRouter.get("/image", (req, res) => {
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

module.exports = { handleTrackingPixel, analyticsRouter };
