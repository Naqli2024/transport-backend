const Driver = require("../models/Driver");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// ===============================
// SEND OTP
// ===============================

exports.sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const driver = await Driver.findOne({
      mobile,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Generate 6-digit OTP

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    driver.otp = otp;

    driver.otpExpiry = new Date(
      Date.now() + 5 * 60 * 1000, // 5 Minutes
    );

    await driver.save();

    // TODO
    // Send OTP through SMS Provider
    // Twilio / MSG91 / Fast2SMS

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// VERIFY OTP (Driver Login)
// =====================================

exports.verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required",
      });
    }

    const driver = await Driver.findOne({ mobile });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // OTP not generated

    if (!driver.otp || !driver.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "Please request OTP first",
      });
    }

    // OTP Expired

    if (driver.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // OTP Mismatch

    if (driver.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Clear OTP after successful login

    driver.otp = null;
    driver.otpExpiry = null;

    await driver.save();

    // Generate JWT

    const token = jwt.sign(
      {
        driverId: driver._id,
        businessId: driver.businessId,
        role: "Driver",
      },
      process.env.JSON_WEB_TOKEN,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      success: true,
      message: "Driver login successful",
      token,

      driver: {
        _id: driver._id,
        driverId: driver.driverId,
        businessId: driver.businessId,
        name: driver.name,
        mobile: driver.mobile,
        availableStatus: driver.availableStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   DRIVER LOGIN
   USERNAME + PASSWORD
================================= */

exports.loginDriver = async (req, res) => {
  try {
    const {
      userName,
      password,
    } = req.body;

    // ================================
    // VALIDATION
    // ================================

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // ================================
    // FIND DRIVER
    //
    // password has select:false
    // so explicitly select it
    // ================================

    const driver = await Driver.findOne({
      userName: userName.toLowerCase(),
    }).select("+password");

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // ================================
    // CHECK PASSWORD
    // ================================

    const isPasswordCorrect = await bcrypt.compare(
      password,
      driver.password,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // ================================
    // CHECK DRIVER STATUS
    // ================================

    if (driver.availableStatus === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Driver account is inactive",
      });
    }

    // ================================
    // GENERATE JWT
    // ================================

    const token = jwt.sign(
      {
        driverId: driver._id,
        businessId: driver.businessId,
        role: "Driver",
      },
      process.env.JSON_WEB_TOKEN,
      {
        expiresIn: "7d",
      },
    );

    // ================================
    // RESPONSE
    // ================================

    res.status(200).json({
      success: true,
      message: "Driver login successful",

      token,

      driver: {
        _id: driver._id,
        driverId: driver.driverId,
        businessId: driver.businessId,
        userName: driver.userName,
        name: driver.name,
        mobile: driver.mobile,
        availableStatus: driver.availableStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};