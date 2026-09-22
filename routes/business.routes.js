const express = require("express");
const router = express.Router();
const controller = require("../controllers/business.controller");
const upload = require("../middleware/upload");

// Register business
router.post("/register", controller.registerBusiness);

// Verify mobile
router.post("/verify-mobile", controller.verifyMobile);

// Get single business
router.get("/:id", controller.getBusinessById);

router.post(
  "/:businessId/logo",
  upload.single("logo"),
  controller.uploadBusinessLogo,
);

module.exports = router;