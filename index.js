require("dotenv").config();
const express = require("express");

const trackingRoutes = require("./track/trackingRoutes");
const emailRoutes = require("./email/emailRoutes");
const app = express();
app.use(express.json());

app.use(trackingRoutes);
app.use(emailRoutes);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
