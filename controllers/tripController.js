const Trip = require("../models/Trip");
const TripDocument = require("../models/TripDocument");
const Vehicle = require("../models/Vehicle");
const VendorVehicle = require("../models/VendorVehicle");
const Driver = require("../models/Driver");
const Customer = require("../models/Customer");
const Broker = require("../models/Broker");
const PreTripInspection = require("../models/PreTripInspection");
const PostTripInspection = require("../models/PostTripInspection");
const Fuel = require("../models/Fuel");
const {
  uploadFile,
  getSignedUrl,
  deleteFile,
  replaceFile,
} = require("../utils/gcpUpload");
const FuelEntry = require("../models/FuelEntry");

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

    // // =========================
    // // CUSTOMER
    // // =========================

    // const customer = await Customer.findOne({
    //   _id: req.body.customerId,
    //   businessId,
    // });

    // if (!customer) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Customer not found",
    //   });
    // }

    // if (customer.status !== "Active") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Customer is inactive",
    //   });
    // }

    // // =========================
    // // BROKER
    // // =========================

    // if (req.body.brokerId) {
    //   const broker = await Broker.findOne({
    //     _id: req.body.brokerId,
    //     businessId,
    //   });

    //   if (!broker) {
    //     return res.status(404).json({
    //       success: false,
    //       message: "Broker not found",
    //     });
    //   }

    //   if (broker.status !== "Active") {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Broker is inactive",
    //     });
    //   }
    // }

    // =========================
    // ORIGIN
    // =========================

    if (
      !req.body.origin ||
      !req.body.origin.location ||
      !req.body.origin.city ||
      !req.body.origin.state
    ) {
      return res.status(400).json({
        success: false,
        message: "Origin details are required",
      });
    }

    // =========================
    // DESTINATION
    // =========================

    if (
      !req.body.destination ||
      !req.body.destination.location ||
      !req.body.destination.city ||
      !req.body.destination.state
    ) {
      return res.status(400).json({
        success: false,
        message: "Destination details are required",
      });
    }

    if (
      req.body.origin.city === req.body.destination.city &&
      req.body.origin.location === req.body.destination.location
    ) {
      return res.status(400).json({
        success: false,
        message: "Origin and Destination cannot be same",
      });
    }

    // =========================
    // JOURNEY LEGS
    // =========================

    if (
      !Array.isArray(req.body.journeyLegs) ||
      req.body.journeyLegs.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one journey leg is required",
      });
    }
    for (const leg of req.body.journeyLegs) {
      if (!leg.from || !leg.to) {
        return res.status(400).json({
          success: false,
          message: "Every journey leg must have From and To",
        });
      }

      if (leg.customerId) {
        const customer = await Customer.findOne({
          _id: leg.customerId,
          businessId,
        });

        if (!customer) {
          return res.status(404).json({
            success: false,
            message: "Journey leg customer not found",
          });
        }
        if (customer.status !== "Active") {
          return res.status(400).json({
            success: false,
            message: "Journey leg customer is inactive",
          });
        }
      }

      if (leg.brokerId) {
        const broker = await Broker.findOne({
          _id: leg.brokerId,
          businessId,
        });

        if (!broker) {
          return res.status(404).json({
            success: false,
            message: "Journey leg broker not found",
          });
        }
      }
    }

    const totalLegs = req.body.journeyLegs.length;

    switch (req.body.journeyType) {
      case "One Way":
        if (totalLegs !== 1) {
          return res.status(400).json({
            success: false,
            message: "One Way trip requires exactly 1 journey leg",
          });
        }
        break;

      case "Round Trip":
        if (totalLegs !== 2) {
          return res.status(400).json({
            success: false,
            message: "Round Trip requires exactly 2 journey legs",
          });
        }
        break;

      case "Multi Leg":
        if (totalLegs < 3) {
          return res.status(400).json({
            success: false,
            message: "Multi Leg requires at least 3 journey legs",
          });
        }
        break;

      case "Relay":
        if (totalLegs !== 2) {
          return res.status(400).json({
            success: false,
            message: "Relay trip requires exactly 2 journey legs",
          });
        }
        break;

      case "Dedicated":
        if (totalLegs < 1) {
          return res.status(400).json({
            success: false,
            message: "Dedicated trip requires at least one journey leg",
          });
        }
        break;
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
        currentTripId: trip._id,
      });
    }

    if (trip.driver2) {
      await Driver.findByIdAndUpdate(trip.driver2, {
        availableStatus: "Reserved",
        currentTripId: trip._id,
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

// Reached Pickup
exports.reachedPickup = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Ready For Loading") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    trip.tripStatus = "Reached Pickup";

    trip.pickupReachedAt = new Date();

    await trip.save();

    res.status(200).json({
      success: true,
      message: "Vehicle reached pickup location",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Complete Loading
exports.completeLoading = async (req, res) => {
  try {
    const businessId = req.driver.businessId;

    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Reached Pickup") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    trip.loading = {
      loadingStartTime: req.body.loadingStartTime,
      loadingEndTime: req.body.loadingEndTime,
      loadedWeight: req.body.loadedWeight,
      loadedBy: req.body.loadedBy,
      remarks: req.body.remarks,
      status: "Completed",
    };

    trip.tripStatus = "Documents Pending";

    await trip.save();

    res.status(200).json({
      success: true,
      message: "Loading completed successfully",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Trip Start
exports.startTrip = async (req, res) => {
  try {
    const businessId = req.driver.businessId;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // =====================================
    // TRIP STATUS
    // =====================================

    if (trip.tripStatus !== "Ready To Start") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // =====================================
    // PRE TRIP INSPECTION
    // =====================================

    const inspection = await PreTripInspection.findOne({
      tripId: trip._id,
      businessId,
      inspectionStatus: "Passed",
    });

    if (!inspection) {
      return res.status(400).json({
        success: false,
        message: "Pre-trip inspection has not been completed",
      });
    }

    // =====================================
    // VEHICLE
    // =====================================

    if (trip.fleetSource === "Own Fleet") {
      const vehicle = await Vehicle.findOne({
        _id: trip.vehicleId,
        businessId,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }

      if (vehicle.status !== "Reserved") {
        return res.status(400).json({
          success: false,
          message: `Vehicle currently ${vehicle.status}`,
        });
      }
    }

    // =====================================
    // VENDOR VEHICLE
    // =====================================

    if (trip.fleetSource === "Vendor") {
      const vendorVehicle = await VendorVehicle.findOne({
        _id: trip.vendorVehicleId,
        businessId,
      });

      if (!vendorVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vendor vehicle not found",
        });
      }

      if (vendorVehicle.status !== "Reserved") {
        return res.status(400).json({
          success: false,
          message: `Vendor vehicle currently ${vendorVehicle.status}`,
        });
      }
    }

    // =====================================
    // DRIVER 1
    // =====================================

    const driver1 = await Driver.findOne({
      _id: trip.driver1,
      businessId,
    });

    if (!driver1) {
      return res.status(404).json({
        success: false,
        message: "Primary driver not found",
      });
    }

    if (driver1.availableStatus !== "Reserved") {
      return res.status(400).json({
        success: false,
        message: `Primary driver currently ${driver1.availableStatus}`,
      });
    }

    // =====================================
    // DRIVER 2
    // =====================================

    let driver2 = null;

    if (trip.driver2) {
      driver2 = await Driver.findOne({
        _id: trip.driver2,
        businessId,
      });

      if (!driver2) {
        return res.status(404).json({
          success: false,
          message: "Second driver not found",
        });
      }

      if (driver2.availableStatus !== "Reserved") {
        return res.status(400).json({
          success: false,
          message: `Second driver currently ${driver2.availableStatus}`,
        });
      }
    }

    // =====================================
    // JOURNEY LEGS
    // =====================================

    if (!trip.journeyLegs || trip.journeyLegs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Journey legs not found",
      });
    }

    // Only first leg starts
    trip.journeyLegs[0].status = "In Progress";

    // =====================================
    // TRIP
    // =====================================

    trip.tripStatus = "In Transit";

    trip.startTime = new Date();

    // Start with first journey leg
    trip.currentLeg = 1;
    trip.journeyLegs[0].status = "In Progress";
    trip.startOdometer = req.body.startOdometer;

    await trip.save();

    // =====================================
    // VEHICLE STATUS
    // =====================================

    if (trip.fleetSource === "Own Fleet") {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        status: "On Trip",
      });
    }

    if (trip.fleetSource === "Vendor") {
      await VendorVehicle.findByIdAndUpdate(trip.vendorVehicleId, {
        status: "On Trip",
      });
    }

    // =====================================
    // DRIVER STATUS
    // =====================================

    await Driver.findByIdAndUpdate(trip.driver1, {
      availableStatus: "On Trip",
    });

    if (trip.driver2) {
      await Driver.findByIdAndUpdate(trip.driver2, {
        availableStatus: "On Trip",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trip started successfully",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Trip reach destination
exports.arriveDestination = async (req, res) => {
  try {
    const businessId = req.driver.businessId;

    const { arrivalOdometer, remarks } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "In Transit") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    const currentLegIndex = trip.currentLeg - 1;

    if (!trip.journeyLegs[currentLegIndex]) {
      return res.status(400).json({
        success: false,
        message: "Invalid current leg",
      });
    }

    if (trip.journeyLegs[currentLegIndex].status !== "In Progress") {
      return res.status(400).json({
        success: false,
        message: "Current leg is not in progress",
      });
    }

    trip.arrivalTime = new Date();

    trip.arrivalOdometer = arrivalOdometer;

    trip.tripStatus = "Unloading";

    trip.journeyLegs[currentLegIndex].status = "Arrived";

    if (remarks) {
      trip.arrivalRemarks = remarks;
    }

    await trip.save();

    res.status(200).json({
      success: true,
      message: "Vehicle arrived at destination",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Complete Unloading
exports.completeUnloading = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Unloading") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    const currentLeg = trip.currentLeg;

    const leg = trip.journeyLegs.find((x) => x.legNo === currentLeg);

    if (!leg) {
      return res.status(404).json({
        success: false,
        message: "Journey leg not found",
      });
    }

    // Complete current leg

    leg.status = "Completed";

    trip.unloading = {
      status: "Completed",
      completedAt: new Date(),
      odometer: req.body.odometer,
      unloadingBy: req.body.unloadingBy,
      receiverName: req.body.receiverName,
      receiverMobile: req.body.receiverMobile,
      remarks: req.body.remarks,
    };

    const totalLegs = trip.journeyLegs.length;

    if (currentLeg < totalLegs) {
      // Move to next leg

      trip.currentLeg = currentLeg + 1;

      trip.tripStatus = "Loading";

      trip.loading = {
        status: "Pending",
      };
    } else {
      // Generate Delivery OTP

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      trip.deliveryOtp = otp;

      trip.deliveryOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);

      trip.deliveryOtpVerified = false;

      trip.tripStatus = "Delivery OTP Pending";
    }

    // // total fuel quantity
    // const fuelEntries = await Fuel.find({
    //   businessId,
    //   tripId: trip._id,
    // });

    // trip.totalFuelQuantity = fuelEntries.reduce(
    //   (sum, fuel) => sum + fuel.quantity,
    //   0,
    // );

    // trip.totalFuelEntries = fuelEntries.length;

    // // totalExpense
    // const expenseEntries = await TripExpense.find({
    //   businessId,
    //   tripId: trip._id,
    // });

    // trip.totalExpense = expenseEntries.reduce(
    //   (sum, expense) => sum + expense.amount,
    //   0,
    // );

    // trip.totalExpenseEntries = expenseEntries.length;

    // //profit
    // trip.profit =
    //   trip.freightAmount -
    //   (trip.driverAdvance +
    //     trip.dieselAmount +
    //     trip.tollAmount +
    //     trip.loadingAmount +
    //     trip.unloadingAmount +
    //     trip.commissionAmount +
    //     trip.miscAmount +
    //     trip.totalFuelCost +
    //     trip.totalExpense);

    // distanceTravelled
    trip.distanceTravelled = trip.arrivalOdometer - trip.startOdometer;

    await trip.save();

    res.status(200).json({
      success: true,
      message:
        currentLeg < totalLegs
          ? "Unloading completed. Ready for next leg."
          : "Unloading completed. Delivery OTP sent to customer.",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// verify delivery with otp
exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { businessId } = req.driver;
    const { tripId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Delivery OTP Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    if (!trip.deliveryOtp) {
      return res.status(400).json({
        success: false,
        message: "Delivery OTP not generated",
      });
    }

    if (trip.deliveryOtpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Delivery OTP has expired",
      });
    }

    if (trip.deliveryOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid Delivery OTP",
      });
    }

    // OTP Verified
    trip.deliveryOtpVerified = true;

    trip.deliveryOtp = null;
    trip.deliveryOtpExpiry = null;

     // Generate POD Number only once
    if (!trip.podNumber) {
      const count = await Trip.countDocuments({
        businessId,
      });

      const year = new Date().getFullYear();

      trip.podNumber = `POD-${year}-${String(count + 1).padStart(6, "0")}`;
    }

    trip.tripStatus = "POD Pending";

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Delivery OTP verified successfully",
      data: {
        tripId: trip._id,
        podNumber: trip.podNumber,
        tripStatus: trip.tripStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Resend Delivery OTP
exports.resendDeliveryOtp = async (req, res) => {
  try {
    const { businessId } = req.driver;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Delivery OTP Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // Generate New OTP

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    trip.deliveryOtp = otp;

    trip.deliveryOtpExpiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    trip.deliveryOtpVerified = false;

    await trip.save();

    // TODO:
    // Send SMS
    // Mobile: trip.unloading.receiverMobile
    // OTP: otp

    return res.status(200).json({
      success: true,
      message: "Delivery OTP resent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.closeTrip = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ============================
    // Trip must be Completed
    // ============================

    if (trip.tripStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // ============================
    // All Journey Legs Completed
    // ============================

    const pendingLeg = trip.journeyLegs.find(
      (leg) => leg.status !== "Completed",
    );

    if (pendingLeg) {
      return res.status(400).json({
        success: false,
        message: "All journey legs must be completed",
      });
    }

    // ============================
    // Post Trip Inspection
    // ============================

    const inspection = await PostTripInspection.findOne({
      tripId: trip._id,
      businessId,
    });

    if (!inspection) {
      return res.status(400).json({
        success: false,
        message: "Post Trip Inspection not completed",
      });
    }

    // ============================
    // Close Trip
    // ============================

    trip.tripStatus = "Closed";
    trip.closedAt = new Date();

    await trip.save();

    // ============================
    // Vehicle Available
    // ============================

    if (trip.fleetSource === "Own Fleet" && trip.vehicleId) {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        status: "Available",
      });
    }

    // ============================
    // Vendor Vehicle Available
    // ============================

    if (trip.fleetSource === "Vendor" && trip.vendorVehicleId) {
      await VendorVehicle.findByIdAndUpdate(trip.vendorVehicleId, {
        status: "Available",
      });
    }

    // ============================
    // Driver 1 Available
    // ============================

    if (trip.driver1) {
      await Driver.findByIdAndUpdate(trip.driver1, {
        availableStatus: "Available",
        currentTripId: null,
      });
    }

    // ============================
    // Driver 2 Available
    // ============================

    if (trip.driver2) {
      await Driver.findByIdAndUpdate(trip.driver2, {
        availableStatus: "Available",
        currentTripId: null,
      });
    }

    // ============================
    // Customer Dashboard
    // ============================

    await Customer.findByIdAndUpdate(trip.customerId, {
      $inc: {
        totalTrips: 1,
        totalRevenue: trip.freightAmount || 0,
      },
    });

    // ============================
    // Broker Dashboard
    // ============================

    if (trip.brokerId) {
      await Broker.findByIdAndUpdate(trip.brokerId, {
        $inc: {
          totalTrips: 1,
          totalCommission: trip.commissionAmount || 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Trip closed successfully",
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

/* ================================
 Trip Document
 =============================== */
exports.uploadTripDocument = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const userId = req.user.userId;

    const { tripId } = req.params;

    const { documentType, documentNumber, remarks } = req.body;

    // Validate trip

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Documents can be uploaded only after loading completion

    // if (trip.tripStatus !== "Ready To Start") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Documents can be uploaded only after loading is completed.",
    //   });
    // }

    // Validate document type

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: "Document type is required",
      });
    }

    // Validate file

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    // Allow only one copy for these document types

    const uniqueDocuments = [
      "EWAY_BILL",
      "INVOICE",
      "DELIVERY_CHALLAN",
      "LR",
      "WEIGHBRIDGE",
      "POD",
    ];

    if (uniqueDocuments.includes(documentType)) {
      const existingDocument = await TripDocument.findOne({
        businessId,
        tripId,
        documentType,
      });

      if (existingDocument) {
        return res.status(400).json({
          success: false,
          message: `${documentType} already uploaded`,
        });
      }
    }

    // Upload document to Google Cloud Storage

    const filePath = await uploadFile(req.file, businessId, "trip-documents");

    // Save document

    const document = await TripDocument.create({
      businessId,
      tripId,
      documentType,
      documentNumber,
      remarks,
      uploadedBy: userId,
      filePath,
    });

    return res.status(201).json({
      success: true,
      message: "Trip document uploaded successfully",
      data: document,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkUploadTripDocuments = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const userId = req.user.userId;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const documentConfigs = [
      {
        field: "ewayBill",
        type: "EWAY_BILL",
      },
      {
        field: "invoice",
        type: "INVOICE",
      },
      {
        field: "lr",
        type: "LR",
      },
      {
        field: "deliveryChallan",
        type: "DELIVERY_CHALLAN",
      },
    ];

    const uploadedDocuments = [];

    for (const config of documentConfigs) {
      const file = req.files?.[config.field]?.[0];

      if (!file) continue;

      // Check if document already exists
      const existingDocument = await TripDocument.findOne({
        businessId,
        tripId,
        documentType: config.type,
      });

      // Upload new file
      const newFilePath = await uploadFile(
        file,
        businessId,
        `trip-documents/${tripId}`
      );

      if (existingDocument) {
        // Delete old file from GCS
        if (existingDocument.filePath) {
          await deleteFile(existingDocument.filePath);
        }

        existingDocument.filePath = newFilePath;
        existingDocument.uploadedBy = userId;

        await existingDocument.save();

        uploadedDocuments.push(existingDocument);
      } else {
        const document = await TripDocument.create({
          businessId,
          tripId,
          documentType: config.type,
          uploadedBy: userId,
          filePath: newFilePath,
        });

        uploadedDocuments.push(document);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Trip documents uploaded successfully.",
      totalDocuments: uploadedDocuments.length,
      data: uploadedDocuments,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripDocuments = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const documents = await TripDocument.find({
      businessId,
      tripId,
    }).sort({ createdAt: 1 });

    const response = await Promise.all(
      documents.map(async (doc) => ({
        _id: doc._id,

        documentType: doc.documentType,

        documentNumber: doc.documentNumber,

        remarks: doc.remarks,

        uploadedBy: doc.uploadedBy,

        createdAt: doc.createdAt,

        fileUrl: await getSignedUrl(doc.filePath),
      })),
    );

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateTripDocument = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { documentId } = req.params;

    const document = await TripDocument.findOne({
      _id: documentId,
      businessId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Update document number
    if (req.body.documentNumber) {
      document.documentNumber = req.body.documentNumber;
    }

    // Update remarks
    if (req.body.remarks) {
      document.remarks = req.body.remarks;
    }

    // Replace document file

    if (req.file) {
      // Keep old file path
      const oldFilePath = document.filePath;

      // Upload new file
      const newFilePath = await uploadFile(
        req.file,
        businessId,
        "trip-documents",
      );

      // Update new file path
      document.filePath = newFilePath;

      // Delete old file
      if (oldFilePath) {
        await deleteFile(oldFilePath);
      }
    }

    await document.save();

    return res.status(200).json({
      success: true,
      message: "Trip document updated successfully",
      data: document,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteTripDocument = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { documentId } = req.params;

    const document = await TripDocument.findOne({
      _id: documentId,
      businessId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete from GCS
    await deleteFile(document.filePath);

    // Delete from MongoDB
    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   Weighbridge 
   ========================================*/
exports.completeWeighbridge = async (req, res) => {
  try {
    const { businessId, driverId } = req.driver;
    const { tripId } = req.params;

    const {
      grossWeight,
      ticketNumber,
      weighbridgeName,
      weighbridgeFee,
      remarks,
    } = req.body;

    // Required field validation

    if (!grossWeight || !ticketNumber || !weighbridgeName || !weighbridgeFee) {
      return res.status(400).json({
        success: false,
        message:
          "Gross weight, ticket number, weighbridge name and weighbridge fee are required",
      });
    }

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "Documents Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // prevent duplicate entries
    if (trip.weighbridge?.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Weighbridge details already submitted",
      });
    }

    // Validate assigned driver
    if (
      trip.driver1?.toString() !== driverId &&
      trip.driver2?.toString() !== driverId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the assigned driver can complete the weighbridge process",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Weighbridge receipt is required",
      });
    }

    // Upload receipt to GCS under trip folder
    const receiptPath = await uploadFile(
      req.file,
      businessId,
      `trip-documents/${tripId}/weighbridge`,
    );

    trip.weighbridge = {
      status: "Completed",
      grossWeight,
      ticketNumber,
      weighbridgeName,
      weighbridgeFee,
      receiptPath,
      remarks,
      measuredAt: new Date(),
      measuredBy: driverId,
    };

    trip.tripStatus = "Ready To Start";

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Weighbridge completed successfully",
      data: trip.weighbridge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getWeighbridge = async (req, res) => {
  try {
    const businessId = req.user.businessId || req.driver.businessId;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (!trip.weighbridge || trip.weighbridge.status === "Pending") {
      return res.status(404).json({
        success: false,
        message: "Weighbridge details not found",
      });
    }

    // Generate signed URL

    const weighbridge = {
      ...trip.weighbridge.toObject(),
      receiptUrl: await getSignedUrl(trip.weighbridge.receiptPath),
    };

    return res.status(200).json({
      success: true,
      data: weighbridge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateWeighbridge = async (req, res) => {
  try {
    const { businessId, driverId } = req.driver;

    const { tripId } = req.params;

    const {
      grossWeight,
      ticketNumber,
      weighbridgeName,
      weighbridgeFee,
      remarks,
    } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (!trip.weighbridge || trip.weighbridge.status !== "Completed") {
      return res.status(404).json({
        success: false,
        message: "Weighbridge details not found",
      });
    }

    if (
      trip.driver1?.toString() !== driverId &&
      trip.driver2?.toString() !== driverId
    ) {
      return res.status(403).json({
        success: false,
        message: "Only assigned driver can update weighbridge",
      });
    }

    let receiptPath = trip.weighbridge.receiptPath;

    if (req.file) {
      receiptPath = await replaceFile(
        req.file,
        businessId,
        `trip-documents/${tripId}/weighbridge`,
        trip.weighbridge.receiptPath,
      );
    }

    trip.weighbridge = {
      ...trip.weighbridge.toObject(),
      grossWeight,
      ticketNumber,
      weighbridgeName,
      weighbridgeFee,
      receiptPath,
      remarks,
      measuredAt: new Date(),
      measuredBy: driverId,
    };

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Weighbridge updated successfully",
      data: trip.weighbridge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================
   Fuel Entry
============================================*/
exports.createFuelEntry = async (req, res) => {
  try {
    const { businessId, driverId } = req.driver;
    const { tripId } = req.params;

    const {
      odometer,
      fuelStation,
      location,
      fuelType,
      quantity,
      rate,
      paymentMode,
      billNo,
      remarks,
    } = req.body;

    if (
      !fuelStation ||
      !fuelType ||
      !quantity ||
      !rate ||
      !paymentMode ||
      !billNo
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Fuel bill is required",
      });
    }

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // if (trip.tripStatus !== "In Transit") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Fuel entry allowed only during transit",
    //   });
    // }

    if (
      trip.driver1?.toString() !== driverId &&
      trip.driver2?.toString() !== driverId
    ) {
      return res.status(403).json({
        success: false,
        message: "Only assigned driver can add fuel",
      });
    }

    const previousFuel = await FuelEntry.findOne({
      businessId,
      tripId,
    }).sort({ odometer: -1 });

    if (previousFuel && Number(odometer) < Number(previousFuel.odometer)) {
      return res.status(400).json({
        success: false,
        message: "Odometer cannot be less than previous fuel entry",
      });
    }

    const amount = Number(quantity) * Number(rate);

    const billPath = await uploadFile(
      req.file,
      businessId,
      `trip-documents/${tripId}/fuel`,
    );

    const fuel = await FuelEntry.create({
      businessId,
      tripId,
      legNo: trip.currentLeg,
      driverId,
      odometer,
      fuelStation,
      location,
      fuelType,
      quantity,
      rate,
      amount,
      paymentMode,
      billNo,
      billPath,
      remarks,
    });

    trip.totalFuelQuantity = (trip.totalFuelQuantity || 0) + Number(quantity);

    trip.totalFuelCost = (trip.totalFuelCost || 0) + amount;

    trip.totalFuelEntries = (trip.totalFuelEntries || 0) + 1;

    await trip.save();

    res.status(201).json({
      success: true,
      message: "Fuel entry added successfully",
      data: fuel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripFuelEntries = async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.driver?.businessId;

    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const entries = await FuelEntry.find({
      businessId,
      tripId,
    }).sort({
      createdAt: -1,
    });

    const response = await Promise.all(
      entries.map(async (fuel) => {
        return {
          ...fuel.toObject(),

          billUrl: fuel.billPath ? await getSignedUrl(fuel.billPath) : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: response.length,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFuelEntry = async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.driver?.businessId;

    const { fuelId } = req.params;

    const fuel = await FuelEntry.findOne({
      _id: fuelId,
      businessId,
    })
      .populate("driverId", "driverId name mobile")
      .populate("tripId", "tripNo tripStatus");

    if (!fuel) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    const response = fuel.toObject();

    response.billUrl = fuel.billPath ? await getSignedUrl(fuel.billPath) : null;

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateFuelEntry = async (req, res) => {
  try {
    const { businessId, driverId } = req.driver;
    const { fuelId } = req.params;

    const fuel = await FuelEntry.findOne({
      _id: fuelId,
      businessId,
    });

    if (!fuel) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    if (fuel.driverId.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        message: "Only the driver who created this fuel entry can update it",
      });
    }

    const trip = await Trip.findOne({
      _id: fuel.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    let billPath = fuel.billPath;

    if (req.file) {
      billPath = await replaceFile(
        req.file,
        businessId,
        `trip-documents/${trip._id}/fuel`,
        fuel.billPath,
      );
    }

    fuel.odometer = req.body.odometer ?? fuel.odometer;

    fuel.fuelStation = req.body.fuelStation ?? fuel.fuelStation;

    fuel.location = req.body.location ?? fuel.location;

    fuel.fuelType = req.body.fuelType ?? fuel.fuelType;

    fuel.quantity = req.body.quantity ?? fuel.quantity;

    fuel.rate = req.body.rate ?? fuel.rate;

    fuel.amount = Number(fuel.quantity) * Number(fuel.rate);

    fuel.paymentMode = req.body.paymentMode ?? fuel.paymentMode;

    fuel.billNo = req.body.billNo ?? fuel.billNo;

    fuel.billPath = billPath;

    fuel.remarks = req.body.remarks ?? fuel.remarks;

    await fuel.save();

    // Recalculate Trip Totals

    const entries = await FuelEntry.find({
      businessId,
      tripId: trip._id,
    });

    trip.totalFuelQuantity = entries.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    trip.totalFuelCost = entries.reduce((sum, item) => sum + item.amount, 0);

    trip.totalFuelEntries = entries.length;

    await trip.save();

    return res.status(200).json({
      success: true,
      message: "Fuel entry updated successfully",
      data: fuel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================
   POD
==========================================*/
// Upload POD
exports.uploadPod = async (req, res) => {
  try {
    const { businessId, driverId } = req.driver;
    const { tripId } = req.params;

    const {
      receiverName,
      receiverMobile,
      podNumber,
      remarks,
    } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus !== "POD Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // Driver validation

    if (
      trip.driver1?.toString() !== driverId &&
      trip.driver2?.toString() !== driverId
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned driver can upload POD",
      });
    }

    // Required fields

    if (
      !receiverName ||
      !receiverMobile ||
      !podNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Receiver name, receiver mobile and POD number are required",
      });
    }

    if (
      !req.files ||
      !req.files.pod
    ) {
      return res.status(400).json({
        success: false,
        message: "Signed POD document is required",
      });
    }

    // Duplicate check

    const existingPod = await Pod.findOne({
      businessId,
      tripId,
    });

    if (existingPod) {
      return res.status(400).json({
        success: false,
        message: "POD already uploaded for this trip",
      });
    }

    // Upload POD

    const podPath = await uploadFile(
      req.files.pod[0],
      businessId,
      `trip-documents/${tripId}/pod`
    );

    // Invoice (Optional)

    let invoicePath = null;

    if (req.files.invoice) {
      invoicePath = await uploadFile(
        req.files.invoice[0],
        businessId,
        `trip-documents/${tripId}/pod`
      );
    }

    // Delivery Challan (Optional)

    let deliveryChallanPath = null;

    if (req.files.deliveryChallan) {
      deliveryChallanPath = await uploadFile(
        req.files.deliveryChallan[0],
        businessId,
        `trip-documents/${tripId}/pod`
      );
    }

    const pod = await Pod.create({
      businessId,
      tripId,
      driverId,
      receiverName,
      receiverMobile,
      podNumber,
      podPath,
      invoicePath,
      deliveryChallanPath,
      remarks,
      status: "Uploaded",
    });

    // Update Trip

    trip.tripStatus = "Delivery Completed";

    trip.endTime = new Date();

    await trip.save();

    return res.status(201).json({
      success: true,
      message: "POD uploaded successfully",
      data: pod,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};