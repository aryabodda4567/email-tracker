require("dotenv").config();
const express = require("express");
const cors = require("cors");
const trackingRoutes = require("./track/trackingRoutes");
const emailRoutes = require("./email/emailRoutes");

const app = express();

// Allow ALL origins (testing only)
app.use(cors());

// Optional but good practice for preflight
app.options("*", cors());

app.use(express.json());


app.use(trackingRoutes);
app.use(emailRoutes);

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
