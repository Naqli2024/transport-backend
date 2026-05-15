const crypto = require("crypto");

if (!global.crypto) {
global.crypto = crypto.webcrypto;
}

// environment variables
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const business = require("./routes/business.routes");
const auth = require("./routes/auth.routes");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected"))
  .catch((err) => console.log(err));

// CORS Configuration
app.use(cors());

// Serve Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API
app.use("/api/business", business);
app.use("/api/auth", auth);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Transport service running on port ${PORT}`);
});