require("dotenv").config();
const transporter = require("./emailConfig");


async function sendTrackedEmail(email, trackingId, subject, htmlBody) {
    // Create tracking pixel
    const trackingPixel = `<img src="${process.env.BASE_URL}/track?id=${trackingId}" width="1" height="1" style="display:none;" />`;

    // Inject tracking pixel into user-provided HTML body
    const htmlWithTracking = `${htmlBody}${trackingPixel}`;


    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: subject,
        html: htmlWithTracking,
        text: htmlBody.replace(/<[^>]*>/g, '') // Fallback text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
}

module.exports = { sendTrackedEmail };
