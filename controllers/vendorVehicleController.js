const VendorVehicle = require("../models/VendorVehicle");
const Vendor = require("../models/Vendor");

exports.createVendorVehicle = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const vendor = await Vendor.findOne({
      _id: req.body.vendorId,
      businessId,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const duplicate = await VendorVehicle.findOne({
      businessId,
      regNo: req.body.regNo.toUpperCase(),
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Vehicle already exists",
      });
    }

    const vehicle = await VendorVehicle.create({
      businessId,
      ...req.body,
      regNo: req.body.regNo.toUpperCase(),
    });

    res.status(201).json({
      success: true,
      message: "Vendor vehicle created",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendorVehicles = async (req, res) => {
  try {
    const vehicles = await VendorVehicle.find({
      businessId: req.user.businessId,
    }).populate("vendorId", "vendorCode companyName");

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendorVehicle = async (req, res) => {
  try {
    const vehicle = await VendorVehicle.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    }).populate("vendorId", "vendorCode companyName");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateVendorVehicle = async (req, res) => {
  try {
    const vehicle = await VendorVehicle.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const updated = await VendorVehicle.findByIdAndUpdate(
      vehicle._id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    res.json({
      success: true,
      message: "Vehicle updated",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteVendorVehicle = async (req, res) => {
  try {
    const vehicle = await VendorVehicle.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    await VendorVehicle.deleteOne({
      _id: vehicle._id,
    });

    res.json({
      success: true,
      message: "Vehicle deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
