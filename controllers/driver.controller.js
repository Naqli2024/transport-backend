const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");

/* =================================
   CREATE DRIVER
================================= */

exports.createDriver = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { mobile, dlNo } = req.body;

    // DUPLICATE MOBILE
    const existingMobile = await Driver.findOne({
      businessId,
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
      businessId,
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
      businessId,
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
    const businessId = req.user.businessId;

    const drivers = await Driver.find({
      businessId,
    })
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
    const businessId = req.user.businessId;

    const { driverId } = req.params;

    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    }).populate("vehicle.vehicleId");

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
    const businessId = req.user.businessId;

    const { driverId } = req.params;

    // CHECK DRIVER EXISTS
    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // ============================
    // DUPLICATE MOBILE CHECK
    // ============================

    if (req.body.mobile) {
      const existingMobile = await Driver.findOne({
        businessId,
        mobile: req.body.mobile,
        _id: { $ne: driverId },
      });

      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    // ============================
    // DUPLICATE LICENSE CHECK
    // ============================

    if (req.body.dlNo) {
      const existingLicense = await Driver.findOne({
        businessId,
        dlNo: req.body.dlNo.toUpperCase(),
        _id: { $ne: driverId },
      });

      if (existingLicense) {
        return res.status(400).json({
          success: false,
          message: "License already exists",
        });
      }
    }

    // ============================
    // UPDATE DRIVER
    // ============================

    const updatedDriver = await Driver.findOneAndUpdate(
      {
        _id: driverId,
        businessId,
      },
      {
        ...req.body,

        dlNo: req.body.dlNo ? req.body.dlNo.toUpperCase() : driver.dlNo,
      },
      {
        new: true,
        runValidators: true,
      },
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
    const businessId = req.user.businessId;

    const driver = await Driver.findOne({
      _id: req.params.driverId,

      businessId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    await Driver.deleteOne({
      _id: req.params.driverId,
      businessId,
    });

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

exports.getDriverDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const drivers = await Driver.find({
      businessId,
    })
      .populate("vehicle.vehicleId")
      .sort({ createdAt: -1 });

    const totalDrivers = drivers.length;

    const available = drivers.filter(
      (d) => d.availableStatus === "Available"
    ).length;

    const reserved = drivers.filter(
      (d) => d.availableStatus === "Reserved"
    ).length;

    const onTrip = drivers.filter(
      (d) => d.availableStatus === "On Trip"
    ).length;

    const onLeave = drivers.filter(
      (d) => d.availableStatus === "On Leave"
    ).length;

    const assigned = drivers.filter(
      (d) => d.vehicle?.status === "Assigned"
    ).length;

    const unassigned = drivers.filter(
      (d) => d.vehicle?.status === "Unassigned"
    ).length;

    const today = new Date();

    let licenseExpiring = 0;

    drivers.forEach((driver) => {
      if (!driver.licenseExpiryDate) return;

      const expiry = new Date(driver.licenseExpiryDate);

      const diffDays = Math.ceil(
        (expiry - today) / (1000 * 60 * 60 * 24)
      );

      if (diffDays >= 0 && diffDays <= 30) {
        licenseExpiring++;
      }
    });

    // ======================================
    // ACTIVE TRIPS
    // ======================================

    const activeTrips = await Trip.find({
      businessId,
      tripStatus: {
        $in: ["Ready To Start", "In Transit"],
      },
    })
      .select(
        "_id tripNo tripStatus vehicleId driver1 driver2 customerName"
      )
      .lean();

    // ======================================
    // DRIVER DETAILS WITH CURRENT TRIP
    // ======================================

    const driverDetails = drivers.map((driver) => {
      const currentTrip = activeTrips.find(
        (trip) =>
          trip.driver1?.toString() === driver._id.toString() ||
          trip.driver2?.toString() === driver._id.toString()
      );

      return {
        ...driver.toObject(),

        currentTrip: currentTrip
          ? {
              tripId: currentTrip._id,
              tripNo: currentTrip.tripNo,
              tripStatus: currentTrip.tripStatus,
              customerName: currentTrip.customerName,
              vehicleId: currentTrip.vehicleId,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDrivers,
          available,
          reserved,
          onTrip,
          onLeave,
          assigned,
          unassigned,
          licenseExpiring,
          activeTrips: activeTrips.length,
        },

        drivers: driverDetails,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// get current trips
exports.getCurrentTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      businessId: req.driver.businessId,
      $or: [
        { driver1: req.driver.driverId },
        { driver2: req.driver.driverId }
      ],
      tripStatus: {
        $in: [
          "Ready For Loading",
          "Loading",
          "Ready To Start",
          "In Transit",
          "Unloading"
        ]
      }
    })

    if (!trip) {
      return res.status(200).json({
        success: true,
        message: "No active trip assigned",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: trip,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};