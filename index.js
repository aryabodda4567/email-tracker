require("dotenv").config();
const express = require("express");
const cors = require("cors");
const trackingRoutes = require("./track/trackingRoutes");
const emailRoutes = require("./email/emailRoutes");

const app = express();

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    next();
});

app.use(express.json());

// Serve static files (css, js, html) from /public
app.use(express.static("public"));

// Redirect root to dashboard
app.get("/", (req, res) => res.redirect("/html/dashboard.html"));

app.use(trackingRoutes);
app.use(emailRoutes);

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
