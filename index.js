require("dotenv").config();
const express = require("express");
const cors = require("cors");
const trackingRoutes = require("./track/trackingRoutes");
const emailRoutes = require("./email/emailRoutes");

const app = express();

// app.use(cors());
app.use(express.json());

app.use(cors({
    origin: "http://127.0.0.1:5500", // your frontend origin
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"]
}));

app.use(trackingRoutes);
app.use(emailRoutes);

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
