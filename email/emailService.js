require("dotenv").config();
const transporter = require("./emailConfig");
const { createEmailAnalytics } = require("../services/analyticsService");

async function sendTrackedEmail(email, trackingId, subject, htmlBody) {

    // Create analytics FIRST
    await createEmailAnalytics(trackingId, subject);

    const trackingPixel = `
      <img src="${process.env.BASE_URL}/track?id=${trackingId}}"
           width="1"
           height="1"
           style="display:none;" />
    `;

    const htmlWithTracking = `${htmlBody}${trackingPixel}`;

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: subject,
        html: htmlWithTracking,
        text: htmlBody.replace(/<[^>]*>/g, '')
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", info.messageId);
    return info;
}

module.exports = { sendTrackedEmail };
