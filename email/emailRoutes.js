require("dotenv").config();
const express = require("express");
const router = express.Router();
const { generateTrackingId } = require("../track/trackingUtils");
const { sendTrackedEmail } = require("./emailService");

router.post("/send-email", async (req, res) => {
    try {
        const { email, subject, htmlBody } = req.body;

        // Validate required fields
        if (!email || !htmlBody) {
            return res.status(400).json({
                error: "Missing required fields: email and htmlBody"
            });
        }

        const trackingId = generateTrackingId();


        await sendTrackedEmail(email, trackingId, subject, htmlBody);

        res.json({
            message: "Email sent with 1×1 tracking pixel",
            trackingId: trackingId
        });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({
            error: "Failed to send email",
            details: error.message
        });
    }
});

module.exports = router;

