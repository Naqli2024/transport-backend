const express = require("express");
const router = express.Router();
const controller = require("../controllers/business.controller");

// Register business
router.post("/register", controller.registerBusiness);

// Verify mobile
router.post("/verify-mobile", controller.verifyMobile);

// Get single business
router.get("/:id", controller.getBusinessById);

module.exports = router;