const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const VendorVehicle = require("../models/VendorVehicle");
const Driver = require("../models/Driver");
const Customer = require("../models/Customer");
const Broker = require("../models/Broker");
const PreTripInspection = require("../models/PreTripInspection");
const PostTripInspection = require("../models/PostTripInspection");
const Fuel = require("../models/Fuel");

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
    // CUSTOMER
    // =========================

    const customer = await Customer.findOne({
      _id: req.body.customerId,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Customer is inactive",
      });
    }

    // =========================
    // BROKER
    // =========================

    if (req.body.brokerId) {
      const broker = await Broker.findOne({
        _id: req.body.brokerId,
        businessId,
      });

      if (!broker) {
        return res.status(404).json({
          success: false,
          message: "Broker not found",
        });
      }

      if (broker.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "Broker is inactive",
        });
      }
    }

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

    trip.tripStatus = "Ready To Start";

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
      podNumber: req.body.podNumber,
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
      // Final destination reached

      trip.tripStatus = "Completed";

      trip.endTime = new Date();
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
          : "Final unloading completed. Trip completed.",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
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
