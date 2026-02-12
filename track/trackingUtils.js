const crypto = require("crypto");

function generateTrackingId() {
    return crypto.randomBytes(16).toString("hex");
}

module.exports = { generateTrackingId };
