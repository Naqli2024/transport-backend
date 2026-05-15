const User = require("../models/User");
const Business = require("../models/Business");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// LOGIN (username OR mobile)
exports.login = async (req, res) => {
  try {
    const { username, mobile, password } = req.body;

    if ((!username && !mobile) || !password) {
      return res.status(400).json({
        message: "Username or Mobile and password required",
      });
    }

    let user;
    let business;

    // Login using username
    if (username) {
      user = await User.findOne({ username });
      if (!user) return res.status(404).json({ message: "User not found" });

      business = await Business.findById(user.businessId);
    }

    // Login using mobile
    if (mobile) {
      business = await Business.findOne({ mobile });
      if (!business) {
        return res.status(404).json({ message: "Company not found" });
      }

      user = await User.findOne({ businessId: business._id });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check mobile verification
    if (!business.isVerified) {
      return res.status(400).json({
        message: "Mobile not verified",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        businessId: business._id,
      },
      process.env.JSON_WEB_TOKEN,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get User with Business 
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId).select("-password");

    const business = await Business.findById(user.businessId);

    res.json({
      user,
      business,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
