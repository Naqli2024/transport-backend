const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");

/* =================================
   CREATE DRIVER
================================= */

exports.createDriver = async (req, res) => {
  try {
    const {
      mobile,
      dlNo,
    } = req.body;

    // DUPLICATE MOBILE
    const existingMobile = await Driver.findOne({
      mobile,
    });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    // DUPLICATE LICENSE
    const existingLicense = await Driver.findOne({
      dlNo: dlNo.toUpperCase(),
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: "License already exists",
      });
    }

    // CREATE DRIVER
    const driver = await Driver.create({
      ...req.body,
      dlNo: dlNo.toUpperCase(),
    });

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   GET ALL DRIVERS
================================= */

exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .populate("vehicle.vehicleId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   GET SINGLE DRIVER
================================= */

exports.getDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId)
      .populate("vehicle.vehicleId");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   UPDATE DRIVER
================================= */

exports.updateDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // UPDATE
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      {
        ...req.body,

        dlNo: req.body.dlNo
          ? req.body.dlNo.toUpperCase()
          : driver.dlNo,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("vehicle.vehicleId");

    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: updatedDriver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   DELETE DRIVER
================================= */

exports.deleteDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    await Driver.findByIdAndDelete(driverId);

    res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   ASSIGN VEHICLE
================================= */

exports.assignVehicle = async (req, res) => {
  try {
    const { driverId } = req.params;

    const { vehicleId } = req.body;

    // FIND DRIVER
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // FIND VEHICLE
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // ASSIGN VEHICLE
    driver.vehicle = {
      status: "Assigned",
      vehicleId: vehicle._id,
      regNo: vehicle.regNo,
      assignedDate: new Date(),
    };

    driver.availableStatus = "On Trip";

    await driver.save();

    res.status(200).json({
      success: true,
      message: "Vehicle assigned successfully",
      data: driver,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};