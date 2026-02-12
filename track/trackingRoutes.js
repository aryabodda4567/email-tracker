const express = require("express");
const router = express.Router();
const { updateEmailOpen } = require("../services/analyticsService");
router.get("/track/:id", async (req, res) => {
  const id = req.params.id;


  await updateEmailOpen(id);
  // 1×1 transparent GIF — no cache, always hit server
  res.set({
    "Content-Type": "image/gif",

    // HTTP/1.1 cache control
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",

    // HTTP/1.0 backward compatibility
    "Pragma": "no-cache",

    // Force expiration
    "Expires": "0",

    // Prevent CDN caching (extra safety)
    "Surrogate-Control": "no-store"
  });

  res.send(
    Buffer.from(
      "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
      "base64"
    )
  );

});

router.get("/image", (req, res) => {
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
