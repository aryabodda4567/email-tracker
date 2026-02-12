const express = require("express");
const router = express.Router();
const { updateEmailOpen } = require("../services/analyticsService");

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

/* Debug test route */
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
