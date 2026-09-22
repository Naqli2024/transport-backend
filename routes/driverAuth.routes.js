const express = require("express");
const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  loginDriver,
} = require("../controllers/driverAuth.controller");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", loginDriver);

module.exports = router;
