const Business = require("../models/Business");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const gcpUpload = require("../utils/gcpUpload");

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register Business + User
exports.registerBusiness = async (req, res) => {
  try {
    const { transportName, address, mobile, businessType, gstNo, username, password } = req.body;

    // Validate input
    if (!transportName || !mobile || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Prevent duplicate business (same mobile)
    const existingBusiness = await Business.findOne({ mobile });
    if (existingBusiness) {
      return res.status(400).json({ message: "Business already exists" });
    }

    // Generate OTP
    const otp = generateOtp();

    // Create Business
    const business = await Business.create({
      transportName,
      address,
      mobile,
      otp,
      businessType,
      gstNo,
      isVerified: false
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const user = await User.create({
      businessId: business._id,
      username,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Business registered successfully",
      business,
      userId: user._id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify OTP 
exports.verifyMobile = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile and OTP required" });
    }

    const business = await Business.findOne({ mobile });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (business.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark verified
    business.isVerified = true;
    business.otp = null; // optional: clear OTP

    await business.save();

    res.json({ message: "Mobile number verified" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get Business by ID
exports.getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id).lean();

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    // =================================
    // GET SIGNED URL FOR BUSINESS LOGO
    // =================================

    let logoUrl = null;

    if (business.logo) {
      logoUrl = await gcpUpload.getSignedUrl(
        business.logo,
        id
      );
    }

    res.json({
      ...business,
      logoUrl,
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================
   UPLOAD / UPDATE BUSINESS LOGO
========================================= */

exports.uploadBusinessLogo = async (req, res) => {
  try {
    const { businessId } = req.params;

    // ================================
    // CHECK FILE
    // ================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Business logo is required",
      });
    }

    // ================================
    // CHECK BUSINESS
    // ================================

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // ================================
    // UPLOAD NEW LOGO
    // ================================

    const newLogoPath = await gcpUpload.uploadFile(
      req.file,
      businessId,
      "logo",
    );

    // ================================
    // DELETE OLD LOGO
    // ================================

    if (business.logo) {
      await gcpUpload.deleteFile(
        business.logo,
        businessId,
      );
    }

    // ================================
    // UPDATE BUSINESS
    // ================================

    business.logo = newLogoPath;

    await business.save();

    // ================================
    // GET SIGNED URL
    // ================================

    const logoUrl = await gcpUpload.getSignedUrl(
      business.logo,
      businessId,
    );

    res.status(200).json({
      success: true,
      message: "Business logo uploaded successfully",

      data: {
        businessId: business._id,
        logo: business.logo,
        logoUrl,
      },
    });
  } catch (error) {
    console.error("Business Logo Upload Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};