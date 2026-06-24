const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const VendorVehicle = require("../models/VendorVehicle");
const Driver = require("../models/Driver");

/* ===============================
   CREATE TRIP
================================ */

exports.createTrip = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    // =========================
    // OWN FLEET
    // =========================

    if (req.body.fleetSource === "Own Fleet") {
      const vehicle = await Vehicle.findOne({
        _id: req.body.vehicleId,
        businessId,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }

      if (vehicle.status !== "Available") {
        return res.status(400).json({
          success: false,
          message: `Vehicle currently ${vehicle.status}`,
        });
      }
    }

    // =========================
    // VENDOR VEHICLE
    // =========================

    if (req.body.fleetSource === "Vendor") {
      const vendorVehicle = await VendorVehicle.findOne({
        _id: req.body.vendorVehicleId,
        businessId,
      });

      if (!vendorVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vendor vehicle not found",
        });
      }

      if (vendorVehicle.status !== "Available") {
        return res.status(400).json({
          success: false,
          message: "Vendor vehicle already assigned",
        });
      }
    }

    // =========================
    // DRIVER 1
    // =========================
    if (!req.body.driver1) {
      return res.status(400).json({
        success: false,
        message: "Primary driver is required",
      });
    }

    if (req.body.driver1) {
      const driver = await Driver.findOne({
        _id: req.body.driver1,
        businessId,
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      if (driver.availableStatus !== "Available") {
        return res.status(400).json({
          success: false,
          message: `Driver currently ${driver.availableStatus}`,
        });
      }
    }

    // =========================
    // DRIVER 2
    // =========================

    if (req.body.driver2) {
      const driver2 = await Driver.findOne({
        _id: req.body.driver2,
        businessId,
      });

      if (!driver2) {
        return res.status(404).json({
          success: false,
          message: "Second driver not found",
        });
      }

      if (driver2.availableStatus !== "Available") {
        return res.status(400).json({
          success: false,
          message: `Second driver currently ${driver2.availableStatus}`,
        });
      }
    }

    if (
      req.body.driver1 &&
      req.body.driver2 &&
      req.body.driver1 === req.body.driver2
    ) {
      return res.status(400).json({
        success: false,
        message: "Driver 1 and Driver 2 cannot be same",
      });
    }

    const trip = await Trip.create({
      businessId,
      ...req.body,
    });

    // Vehicle Status

    if (trip.fleetSource === "Own Fleet" && trip.vehicleId) {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        status: "Reserved",
      });
    }

    // Vendor Vehicle Status

    if (trip.fleetSource === "Vendor" && trip.vendorVehicleId) {
      await VendorVehicle.findByIdAndUpdate(trip.vendorVehicleId, {
        status: "Reserved",
      });
    }

    // Driver Status

    if (trip.driver1) {
      await Driver.findByIdAndUpdate(trip.driver1, {
        availableStatus: "Reserved",
        currentTripId: trip._id
      });
    }

    if (trip.driver2) {
      await Driver.findByIdAndUpdate(trip.driver2, {
        availableStatus: "Reserved",
        currentTripId: trip._id
      });
    }

    res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===============================
   GET ALL TRIPS
================================ */

exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      businessId: req.user.businessId,
    })
      .populate("vehicleId")
      .populate("vendorId")
      .populate("vendorVehicleId")
      .populate("driver1")
      .populate("driver2")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: trips.length,
      data: trips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===============================
   GET SINGLE TRIP
================================ */

exports.getTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    })
      .populate("vehicleId")
      .populate("vendorId")
      .populate("vendorVehicleId")
      .populate("driver1")
      .populate("driver2");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.json({
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

/* ===============================
   UPDATE TRIP
================================ */

exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (["In Transit", "Completed", "Closed"].includes(trip.tripStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update trip in ${trip.tripStatus} status`,
      });
    }

    delete req.body.vehicleId;
    delete req.body.vendorVehicleId;
    delete req.body.driver1;
    delete req.body.driver2;
    delete req.body.fleetSource;
    delete req.body.tripStatus;

    const updatedTrip = await Trip.findByIdAndUpdate(trip._id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Trip updated successfully",
      data: updatedTrip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===============================
   DELETE TRIP
================================ */

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Pre Trip Pending") {
      return res.status(400).json({
        success: false,
        message: "Only Pre Trip Pending trips can be deleted",
      });
    }

    // RELEASE VEHICLE
    if (trip.fleetSource === "Own Fleet" && trip.vehicleId) {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        status: "Available",
      });
    }

    if (trip.fleetSource === "Vendor" && trip.vendorVehicleId) {
      await VendorVehicle.findByIdAndUpdate(trip.vendorVehicleId, {
        status: "Available",
      });
    }

    if (trip.driver1) {
      await Driver.findByIdAndUpdate(trip.driver1, {
        availableStatus: "Available",
      });
    }

    if (trip.driver2) {
      await Driver.findByIdAndUpdate(trip.driver2, {
        availableStatus: "Available",
      });
    }

    await Trip.deleteOne({
      _id: trip._id,
    });

    res.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===============================
   DASHBOARD
================================ */

exports.getTripDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const totalTrips = await Trip.countDocuments({
      businessId,
    });

    const preTripPending = await Trip.countDocuments({
      businessId,
      tripStatus: "Pre Trip Pending",
    });

    const readyToStart = await Trip.countDocuments({
      businessId,
      tripStatus: "Ready To Start",
    });

    const inTransit = await Trip.countDocuments({
      businessId,
      tripStatus: "In Transit",
    });

    const completed = await Trip.countDocuments({
      businessId,
      tripStatus: "Completed",
    });

    const revenue = await Trip.aggregate([
      {
        $match: {
          businessId: req.user.businessId,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$freightAmount",
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalTrips,
        preTripPending,
        readyToStart,
        inTransit,
        completed,
        revenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
