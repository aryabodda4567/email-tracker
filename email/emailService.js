require("dotenv").config();
const transporter = require("./emailConfig");
const { createEmailAnalytics } = require("../services/analyticsService");

async function sendTrackedEmail(email, trackingId, subject, htmlBody) {

    // Create analytics FIRST
    await createEmailAnalytics(trackingId, subject, email);

    const trackingPixel = `
<img src="${process.env.BASE_URL}/track/${trackingId}"
     width="1"
     height="1"
     style="display:none;" />
`;

    // Convert plain text newlines to <br>
    const formattedBody = htmlBody
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

    const htmlWithTracking = `
<div style="font-family: Arial, sans-serif;">
    ${formattedBody}
</div>
${trackingPixel}
`;

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: subject,
        html: htmlWithTracking,
        text: htmlBody // keep original for text fallback
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", info.messageId);
    return info;
}

module.exports = { sendTrackedEmail };
