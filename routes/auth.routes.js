const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

// Login
router.post("/login", controller.login);

// Get profile
router.get("/user-details", auth, controller.getUserProfile);

module.exports = router;