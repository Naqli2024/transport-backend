const Vendor = require("../models/Vendor");

exports.createVendor = async (req, res) => {
  try {
    const businessId =
      req.user.businessId;

    const existingVendor =
      await Vendor.findOne({
        businessId,
        mobile: req.body.mobile,
      });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message:
          "Vendor mobile already exists",
      });
    }

    const vendor =
      await Vendor.create({
        businessId,
        ...req.body,
      });

    res.status(201).json({
      success: true,
      message:
        "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors =
      await Vendor.find({
        businessId:
          req.user.businessId,
      }).sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendor = async (req, res) => {
  try {
    const vendor =
      await Vendor.findOne({
        _id: req.params.id,
        businessId:
          req.user.businessId,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const businessId =
      req.user.businessId;

    const vendor =
      await Vendor.findOne({
        _id: req.params.id,
        businessId,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (
      req.body.mobile &&
      req.body.mobile !== vendor.mobile
    ) {
      const duplicate =
        await Vendor.findOne({
          businessId,
          mobile: req.body.mobile,
          _id: { $ne: vendor._id },
        });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile already exists",
        });
      }
    }

    const updated =
      await Vendor.findByIdAndUpdate(
        vendor._id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    res.json({
      success: true,
      message:
        "Vendor updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor =
      await Vendor.findOne({
        _id: req.params.id,
        businessId:
          req.user.businessId,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await Vendor.deleteOne({
      _id: vendor._id,
    });

    res.json({
      success: true,
      message:
        "Vendor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};