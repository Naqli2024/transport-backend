const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const FuelEntry = require("../models/FuelEntry");
const TripExpense = require("../models/TripExpense");
const {
  uploadFile,
  getSignedUrl,
  deleteFile,
  replaceFile,
} = require("../utils/gcpUpload");

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
      (d) => d.availableStatus === "Available",
    ).length;

    const reserved = drivers.filter(
      (d) => d.availableStatus === "Reserved",
    ).length;

    const onTrip = drivers.filter(
      (d) => d.availableStatus === "On Trip",
    ).length;

    const onLeave = drivers.filter(
      (d) => d.availableStatus === "On Leave",
    ).length;

    const assigned = drivers.filter(
      (d) => d.vehicle?.status === "Assigned",
    ).length;

    const unassigned = drivers.filter(
      (d) => d.vehicle?.status === "Unassigned",
    ).length;

    const today = new Date();

    let licenseExpiring = 0;

    drivers.forEach((driver) => {
      if (!driver.licenseExpiryDate) return;

      const expiry = new Date(driver.licenseExpiryDate);

      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

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
      .select("_id tripNo tripStatus vehicleId driver1 driver2 customerName")
      .lean();

    // ======================================
    // DRIVER DETAILS WITH CURRENT TRIP
    // ======================================

    const driverDetails = drivers.map((driver) => {
      const currentTrip = activeTrips.find(
        (trip) =>
          trip.driver1?.toString() === driver._id.toString() ||
          trip.driver2?.toString() === driver._id.toString(),
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

// Individual driver dashboard
exports.getIndividualDriverDashboard = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { driverId } = req.params;

    // Driver
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

    // All trips
    const trips = await Trip.find({
      businessId,
      $or: [{ driver1: driverId }, { driver2: driverId }],
    }).sort({
      createdAt: -1,
    });

    // Current Trip
    const currentTrip = trips.find((trip) =>
      [
        "Pre Trip Pending",
        "Inspection Pending",
        "Ready For Loading",
        "Documents Pending",
        "Reached Pickup",
        "Loading",
        "Ready To Start",
        "In Transit",
        "Unloading",
        "Delivery OTP Pending",
        "POD Pending",
      ].includes(trip.tripStatus),
    );

    // Summary
    const completedTrips = trips.filter(
      (trip) => trip.tripStatus === "Completed",
    );

    const runningTrips = trips.filter((trip) =>
      [
        "Pre Trip Pending",
        "Inspection Pending",
        "Ready For Loading",
        "Documents Pending",
        "Reached Pickup",
        "Loading",
        "Ready To Start",
        "In Transit",
        "Unloading",
        "Delivery OTP Pending",
        "POD Pending",
      ].includes(trip.tripStatus),
    );

    const cancelledTrips = trips.filter(
      (trip) => trip.tripStatus === "Cancelled",
    );

    const totalDistance = completedTrips.reduce(
      (sum, trip) => sum + (trip.distanceTravelled || 0),
      0,
    );

    // Fuel
    const fuelEntries = await FuelEntry.find({
      businessId,
      driverId,
    });

    const totalFuel = fuelEntries.reduce(
      (sum, fuel) => sum + (fuel.quantity || 0),
      0,
    );

    // Trip History
    const tripHistory = trips.map((trip) => ({
      tripId: trip._id,
      tripNo: trip.tripNo,
      customerName: trip.customerName,
      tripStatus: trip.tripStatus,
      startTime: trip.startTime,
      endTime: trip.endTime,
      distanceTravelled: trip.distanceTravelled || 0,
      freightAmount: trip.freightAmount || 0,
      totalFuelQuantity: trip.totalFuelQuantity || 0,
    }));

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          driverName: driver.name,
          driverCode: driver.driverCode,
          mobile: driver.mobile,
          availableStatus: driver.availableStatus,

          vehicle: driver.vehicle,

          totalTrips: trips.length,

          completedTrips: completedTrips.length,

          runningTrips: runningTrips.length,

          cancelledTrips: cancelledTrips.length,

          totalDistance,

          totalFuel,

          fuelEntries: fuelEntries.length,

          revenue: 0,

          joiningDate: driver.createdAt,

          licenseExpiryDate: driver.licenseExpiryDate,
        },

        currentTrip,

        tripHistory,
      },
    });
  } catch (error) {
    return res.status(500).json({
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
      $or: [{ driver1: req.driver.driverId }, { driver2: req.driver.driverId }],
      tripStatus: {
        $in: [
          "Pre Trip Pending",
          "Inspection Pending",
          "Ready For Loading",
          "Documents Pending",
          "Reached Pickup",
          "Loading",
          "Ready To Start",
          "In Transit",
          "Unloading",
          "Delivery OTP Pending",
          "Completed",
        ],
      },
    });

    if (!trip) {
      return res.status(200).json({
        success: true,
        message: "No active trip assigned",
        data: null,
      });
    }

    const fileUrl = trip.weighbridge?.receiptPath
      ? await getSignedUrl(trip.weighbridge.receiptPath)
      : null;

    // Get Loading & Unloading Expenses
    const expenses = await TripExpense.find({
      businessId: req.driver.businessId,
      tripId: trip._id,
      expenseType: {
        $in: ["Loading", "Unloading"],
      },
    }).lean();

    const loadingExpense = expenses.find((x) => x.expenseType === "Loading");

    const unloadingExpense = expenses.find(
      (x) => x.expenseType === "Unloading",
    );

    trip.loadingExpense = loadingExpense
      ? {
          ...loadingExpense,
          fileUrl: loadingExpense.billImage
            ? await getSignedUrl(loadingExpense.billImage)
            : null,
        }
      : null;

    trip.unloadingExpense = unloadingExpense
      ? {
          ...unloadingExpense,
          fileUrl: unloadingExpense.billImage
            ? await getSignedUrl(unloadingExpense.billImage)
            : null,
        }
      : null;

    res.status(200).json({
      success: true,
      data: {
        ...trip.toObject(),
        weighbridge: {
          ...(trip.weighbridge.toObject?.() || trip.weighbridge),
          fileUrl,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
