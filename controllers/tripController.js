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
const TripExpense = require("../models/TripExpense");
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

    const {
      fleetSource,
      vehicleId,
      vendorId,
      vendorVehicleId,
      journeyType,
      journeyLegs,
    } = req.body;

    // =========================================================
    // BASIC VALIDATION
    // =========================================================

    if (!fleetSource) {
      return res.status(400).json({
        success: false,
        message: "fleetSource is required",
      });
    }

    if (!journeyType) {
      return res.status(400).json({
        success: false,
        message: "journeyType is required",
      });
    }

    if (!Array.isArray(journeyLegs) || journeyLegs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one journey leg is required",
      });
    }

    // =========================================================
    // JOURNEY TYPE LEG COUNT VALIDATION
    // =========================================================

    switch (journeyType) {
      case "One Way":
        if (journeyLegs.length !== 1) {
          return res.status(400).json({
            success: false,
            message: "One Way journey must contain exactly 1 leg",
          });
        }
        break;

      case "Round Trip":
        if (journeyLegs.length !== 2) {
          return res.status(400).json({
            success: false,
            message: "Round Trip journey must contain exactly 2 legs",
          });
        }
        break;

      case "Multi Leg":
        if (journeyLegs.length < 1) {
          return res.status(400).json({
            success: false,
            message: "Multi Leg journey must contain at least 1 leg",
          });
        }
        break;

      case "Relay":
        if (journeyLegs.length !== 2) {
          return res.status(400).json({
            success: false,
            message: "Relay journey must contain exactly 2 legs",
          });
        }
        break;

      case "Dedicated":
        if (journeyLegs.length < 1) {
          return res.status(400).json({
            success: false,
            message: "Dedicated journey must contain at least 1 leg",
          });
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Invalid journey type: ${journeyType}`,
        });
    }

    // =========================================================
    // VEHICLE VALIDATION
    // =========================================================

    if (fleetSource === "Own Fleet") {
      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          message: "vehicleId is required for Own Fleet",
        });
      }

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        businessId,
        fleet: "vehicle",
        status: "Available",
      });

      if (!vehicle) {
        return res.status(400).json({
          success: false,
          message: "Vehicle not found or not available",
        });
      }
    }

    if (fleetSource === "Vendor") {
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "vendorId is required for Vendor fleet",
        });
      }

      if (!vendorVehicleId) {
        return res.status(400).json({
          success: false,
          message: "vendorVehicleId is required for Vendor fleet",
        });
      }

      const vendorVehicle = await VendorVehicle.findOne({
        _id: vendorVehicleId,
        vendorId,
        businessId,
        status: "Available",
      });

      if (!vendorVehicle) {
        return res.status(400).json({
          success: false,
          message: "Vendor vehicle not found or not available",
        });
      }
    }

    // =========================================================
    // VALIDATE EACH LEG
    // =========================================================

    const processedLegs = [];

    const usedDrivers = new Set();

    for (let i = 0; i < journeyLegs.length; i++) {
      const leg = journeyLegs[i];

      // -------------------------------------------------------
      // ROUTE
      // -------------------------------------------------------

      if (!leg.from || !leg.to) {
        return res.status(400).json({
          success: false,
          message: `From and To are required for Leg ${i + 1}`,
        });
      }

      // -------------------------------------------------------
      // CUSTOMER / BROKER
      // -------------------------------------------------------

      if (!leg.customerId && !leg.brokerId) {
        return res.status(400).json({
          success: false,
          message: `Either customerId or brokerId is required for Leg ${i + 1}`,
        });
      }

      // -------------------------------------------------------
      // CUSTOMER VALIDATION
      // -------------------------------------------------------

      if (leg.customerId) {
        const customer = await Customer.findOne({
          _id: leg.customerId,
          businessId,
          status: "Active",
        });

        if (!customer) {
          return res.status(400).json({
            success: false,
            message: `Customer not found or inactive for Leg ${i + 1}`,
          });
        }
      }

      // -------------------------------------------------------
      // BROKER VALIDATION
      // -------------------------------------------------------

      if (leg.brokerId) {
        const broker = await Broker.findOne({
          _id: leg.brokerId,
          businessId,
          status: "Active",
        });

        if (!broker) {
          return res.status(400).json({
            success: false,
            message: `Broker not found or inactive for Leg ${i + 1}`,
          });
        }
      }

      // -------------------------------------------------------
      // DRIVER 1 VALIDATION
      // -------------------------------------------------------

      if (!leg.driver1) {
        return res.status(400).json({
          success: false,
          message: `driver1 is required for Leg ${i + 1}`,
        });
      }

      const driver1 = await Driver.findOne({
        _id: leg.driver1,
        businessId,
        availableStatus: "Available",
      });

      if (!driver1) {
        return res.status(400).json({
          success: false,
          message: `Driver 1 not found or unavailable for Leg ${i + 1}`,
        });
      }

      // Prevent same driver being assigned to multiple legs
      if (usedDrivers.has(String(leg.driver1))) {
        return res.status(400).json({
          success: false,
          message: `Driver 1 is already assigned to another leg`,
        });
      }

      usedDrivers.add(String(leg.driver1));

      // -------------------------------------------------------
      // DRIVER 2 VALIDATION
      // -------------------------------------------------------

      if (leg.driver2) {
        if (String(leg.driver1) === String(leg.driver2)) {
          return res.status(400).json({
            success: false,
            message: `Driver 1 and Driver 2 cannot be the same for Leg ${i + 1}`,
          });
        }

        const driver2 = await Driver.findOne({
          _id: leg.driver2,
          businessId,
          availableStatus: "Available",
        });

        if (!driver2) {
          return res.status(400).json({
            success: false,
            message: `Driver 2 not found or unavailable for Leg ${i + 1}`,
          });
        }

        if (usedDrivers.has(String(leg.driver2))) {
          return res.status(400).json({
            success: false,
            message: `Driver 2 is already assigned to another leg`,
          });
        }

        usedDrivers.add(String(leg.driver2));
      }

      // -------------------------------------------------------
      // DRIVER SALARY
      // -------------------------------------------------------

      if (
        leg.driverSalary !== undefined &&
        (typeof leg.driverSalary !== "number" || leg.driverSalary < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid driverSalary for Leg ${i + 1}`,
        });
      }

      // -------------------------------------------------------
      // DRIVER ADVANCE
      // -------------------------------------------------------

      if (leg.driverAdvance !== undefined) {
        if (!Array.isArray(leg.driverAdvance)) {
          return res.status(400).json({
            success: false,
            message: `driverAdvance must be an array for Leg ${i + 1}`,
          });
        }

        for (const advance of leg.driverAdvance) {
          if (!advance.date || advance.amount === undefined) {
            return res.status(400).json({
              success: false,
              message: `Each driverAdvance entry must contain date and amount for Leg ${i + 1}`,
            });
          }

          if (typeof advance.amount !== "number" || advance.amount < 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid driverAdvance amount for Leg ${i + 1}`,
            });
          }
        }
      }

      // =======================================================
      // BUILD LEG
      // Backend controls legNo and legStatus
      // =======================================================

      processedLegs.push({
        ...leg,

        legNo: i + 1,

        legStatus: "Pre Trip Pending",
      });
    }

    // =========================================================
    // CREATE TRIP
    // =========================================================

    const trip = await Trip.create({
      businessId,

      fleetSource,

      vehicleId: fleetSource === "Own Fleet" ? vehicleId : undefined,

      vendorId: fleetSource === "Vendor" ? vendorId : undefined,

      vendorVehicleId: fleetSource === "Vendor" ? vendorVehicleId : undefined,

      journeyType,

      currentLeg: 1,

      tripStatus: "Pre Trip Pending",

      journeyLegs: processedLegs,

      totalFuelCost: 0,
      totalFuelQuantity: 0,
      totalExpense: 0,
      profit: 0,
      distanceTravelled: 0,
    });

    // =========================================================
    // RESERVE VEHICLE
    // =========================================================

    if (fleetSource === "Own Fleet") {
      await Vehicle.findOneAndUpdate(
        {
          _id: vehicleId,
          businessId,
        },
        {
          $set: {
            status: "Reserved",
            currentTripId: trip._id,
          },
        },
      );
    }

    // =========================================================
    // RESERVE VENDOR VEHICLE
    // =========================================================

    if (fleetSource === "Vendor") {
      await VendorVehicle.findOneAndUpdate(
        {
          _id: vendorVehicleId,
          vendorId,
          businessId,
        },
        {
          $set: {
            status: "On Trip",
            currentTripId: trip._id,
          },
        },
      );
    }

    // =========================================================
    // RESERVE ALL DRIVERS
    // =========================================================

    for (const leg of processedLegs) {
      await Driver.findOneAndUpdate(
        {
          _id: leg.driver1,
          businessId,
        },
        {
          $set: {
            availableStatus: "Reserved",
            currentTripId: trip._id,
          },
        },
      );

      if (leg.driver2) {
        await Driver.findOneAndUpdate(
          {
            _id: leg.driver2,
            businessId,
          },
          {
            $set: {
              availableStatus: "Reserved",
              currentTripId: trip._id,
            },
          },
        );
      }
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: trip,
    });
  } catch (error) {
    console.error("createTrip error:", error);

    return res.status(500).json({
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
    const businessId = req.user.businessId;

    const trip = await Trip.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // =====================================================
    // COMPLETED / CLOSED TRIP
    // =====================================================

    if (["Completed", "Closed"].includes(trip.tripStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update trip in ${trip.tripStatus} status`,
      });
    }

    // =====================================================
    // ONLY MULTI LEG CAN ADD NEW LEGS
    // =====================================================

    if (
      req.body.journeyLegs !== undefined &&
      trip.journeyType !== "Multi Leg"
    ) {
      return res.status(400).json({
        success: false,
        message: "New journey legs can only be added to Multi Leg trips",
      });
    }

    // =====================================================
    // REMOVE NON-EDITABLE TRIP FIELDS
    // =====================================================

    delete req.body.vehicleId;
    delete req.body.vendorId;
    delete req.body.vendorVehicleId;
    delete req.body.driver1;
    delete req.body.driver2;
    delete req.body.fleetSource;

    // Operational trip fields must NEVER be changed
    // through updateTrip.

    delete req.body.tripStatus;
    delete req.body.currentLeg;
    delete req.body.totalFuelCost;
    delete req.body.totalFuelQuantity;
    delete req.body.totalFuelEntries;
    delete req.body.totalExpense;
    delete req.body.totalExpenseEntries;
    delete req.body.profit;
    delete req.body.distanceTravelled;
    delete req.body.completedAt;
    delete req.body.closedAt;
    delete req.body.settlement;

    // =====================================================
    // ADD DRIVER ADVANCE TO EXISTING LEG
    // =====================================================

    if (req.body.legNo !== undefined && req.body.driverAdvance !== undefined) {
      const legNo = Number(req.body.legNo);

      // Validate leg number
      if (!Number.isInteger(legNo) || legNo < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid legNo",
        });
      }

      // Find existing leg
      const leg = trip.journeyLegs.find((item) => item.legNo === legNo);

      if (!leg) {
        return res.status(404).json({
          success: false,
          message: `Journey Leg ${legNo} not found`,
        });
      }

      // Validate driver advance object
      const { date, amount } = req.body.driverAdvance;

      if (!date || amount === undefined) {
        return res.status(400).json({
          success: false,
          message: "Driver advance requires date and amount",
        });
      }

      if (isNaN(amount) || Number(amount) < 0) {
        return res.status(400).json({
          success: false,
          message: "Driver advance amount must be a valid non-negative number",
        });
      }

      // Make sure array exists
      if (!Array.isArray(leg.driverAdvance)) {
        leg.driverAdvance = [];
      }

      // ADD new advance entry
      leg.driverAdvance.push({
        date: new Date(date),
        amount: Number(amount),
      });

      await trip.save();

      return res.status(200).json({
        success: true,
        message: `Driver advance added successfully to Leg ${legNo}`,
        data: {
          tripId: trip._id,
          tripNo: trip.tripNo,
          currentLeg: trip.currentLeg,
          tripStatus: trip.tripStatus,
          legNo: leg.legNo,
          driverAdvance: leg.driverAdvance,
        },
      });
    }

    // =====================================================
    // MULTI LEG - ADD FUTURE LEGS
    // =====================================================
    let newJourneyLegs = [];
    if (req.body.journeyLegs !== undefined) {
      if (
        !Array.isArray(req.body.journeyLegs) ||
        req.body.journeyLegs.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "At least one new journey leg is required",
        });
      }

      /*
       * IMPORTANT:
       *
       * We do NOT replace trip.journeyLegs.
       *
       * Existing legs remain untouched.
       *
       * Only new legs are pushed into the array.
       */

      let nextLegNo = trip.journeyLegs.length + 1;

      for (const leg of req.body.journeyLegs) {
        // =================================================
        // FROM / TO
        // =================================================

        if (!leg.from || !leg.to) {
          return res.status(400).json({
            success: false,
            message: "Every new journey leg must have From and To",
          });
        }

        // =================================================
        // CUSTOMER / BROKER
        // =================================================

        if (!leg.customerId && !leg.brokerId) {
          return res.status(400).json({
            success: false,
            message:
              "Every new journey leg must have either customerId or brokerId",
          });
        }

        // =================================================
        // CUSTOMER VALIDATION
        // =================================================

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

        // =================================================
        // BROKER VALIDATION
        // =================================================

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

          if (broker.status && broker.status !== "Active") {
            return res.status(400).json({
              success: false,
              message: "Journey leg broker is inactive",
            });
          }
        }

        // =================================================
        // DRIVER VALIDATION
        // =================================================

        if (!leg.driver1) {
          return res.status(400).json({
            success: false,
            message: "Primary driver is required for every new journey leg",
          });
        }

        const driver1 = await Driver.findOne({
          _id: leg.driver1,
          businessId,
        });

        if (!driver1) {
          return res.status(404).json({
            success: false,
            message: "Primary driver not found",
          });
        }

        /*
         * A future leg is not allowed to use a driver who
         * is currently operating another trip.
         *
         * If Leg 1 is currently In Transit, its driver will
         * normally be On Trip, so the same driver cannot be
         * allocated to Leg 2 at this point.
         */
        if (driver1.availableStatus !== "Available") {
          return res.status(400).json({
            success: false,
            message: `Primary driver currently ${driver1.availableStatus}`,
          });
        }

        // =================================================
        // DRIVER 2 VALIDATION
        // =================================================

        if (leg.driver2) {
          if (leg.driver2.toString() === leg.driver1.toString()) {
            return res.status(400).json({
              success: false,
              message: "Driver 1 and Driver 2 cannot be the same",
            });
          }

          const driver2 = await Driver.findOne({
            _id: leg.driver2,
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

        // =================================================
        // DRIVER SALARY
        // =================================================

        if (
          leg.driverSalary !== undefined &&
          (isNaN(leg.driverSalary) || Number(leg.driverSalary) < 0)
        ) {
          return res.status(400).json({
            success: false,
            message: "Driver salary must be a valid positive amount",
          });
        }

        // =================================================
        // DRIVER ADVANCE
        // =================================================

        if (leg.driverAdvance !== undefined) {
          if (!Array.isArray(leg.driverAdvance)) {
            return res.status(400).json({
              success: false,
              message: "driverAdvance must be an array",
            });
          }

          for (const advance of leg.driverAdvance) {
            if (!advance.date || advance.amount === undefined) {
              return res.status(400).json({
                success: false,
                message: "Each driver advance must have date and amount",
              });
            }

            if (Number(advance.amount) < 0) {
              return res.status(400).json({
                success: false,
                message: "Driver advance amount cannot be negative",
              });
            }
          }
        }

        // =================================================
        // CREATE NEW LEG
        // =================================================

        newJourneyLegs.push({
          ...leg,

          // Backend-owned fields
          legNo: nextLegNo,
          legStatus: "Pre Trip Pending",

          // Do not allow client to initialize operational data
          pickupReachedAt: undefined,
          startTime: undefined,
          startOdometer: undefined,
          endTime: undefined,
          arrivalTime: undefined,
          arrivalOdometer: undefined,
          arrivalRemarks: undefined,
          completedAt: undefined,
        });

        nextLegNo++;
      }

      // =================================================
      // ADD ONLY NEW LEGS
      // =================================================

      trip.journeyLegs.push(...newJourneyLegs);

      await trip.save();

      // Remove journeyLegs so it is NOT processed again
      delete req.body.journeyLegs;
    }

    // =====================================================
    // UPDATE OTHER NON-OPERATIONAL TRIP FIELDS
    // =====================================================

    const allowedTripFields = [
      // Add only fields that you genuinely want editable
      // after trip creation.
    ];

    const updateData = {};

    for (const field of allowedTripFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    let updatedTrip = trip;

    if (Object.keys(updateData).length > 0) {
      updatedTrip = await Trip.findOneAndUpdate(
        {
          _id: trip._id,
          businessId,
        },
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message:
        newJourneyLegs.length > 0
          ? "New journey leg(s) added successfully"
          : "Trip updated successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("updateTrip error:", error);

    return res.status(500).json({
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

    // =========================================================
    // FIND TRIP
    // =========================================================

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

    // =========================================================
    // GET CURRENT LEG
    // =========================================================

    const currentLegIndex = trip.currentLeg - 1;

    const currentLeg = trip.journeyLegs[currentLegIndex];

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: `Current leg ${trip.currentLeg} not found`,
      });
    }

    // =========================================================
    // TRIP STATUS CHECK
    // =========================================================

    if (trip.tripStatus !== "Ready For Loading") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // =========================================================
    // CURRENT LEG STATUS CHECK
    // =========================================================

    if (currentLeg.legStatus !== "Ready For Loading") {
      return res.status(400).json({
        success: false,
        message: `Leg ${currentLeg.legNo} currently ${currentLeg.legStatus}`,
      });
    }

    // =========================================================
    // UPDATE CURRENT LEG
    // =========================================================

    currentLeg.legStatus = "Reached Pickup";

    currentLeg.pickupReachedAt = new Date();

    // UPDATE TRIP STATUS
    trip.tripStatus = "Reached Pickup";

    await trip.save();

    return res.status(200).json({
      success: true,
      message: `Vehicle reached pickup for Leg ${currentLeg.legNo}`,
      data: trip,
    });
  } catch (error) {
    console.error("reachedPickup error:", error);

    return res.status(500).json({
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

    // =====================================================
    // MULTI LEG
    // =====================================================

    if (trip.journeyType === "Multi Leg") {
      const currentLegIndex = trip.currentLeg - 1;

      const currentLeg = trip.journeyLegs[currentLegIndex];

      if (!currentLeg) {
        return res.status(400).json({
          success: false,
          message: `Current leg ${trip.currentLeg} not found`,
        });
      }

      // =========================
      // TRIP STATUS CHECK
      // =========================

      if (trip.tripStatus !== "Reached Pickup") {
        return res.status(400).json({
          success: false,
          message: `Trip currently ${trip.tripStatus}`,
        });
      }

      // =========================
      // LEG STATUS CHECK
      // =========================

      if (currentLeg.legStatus !== "Reached Pickup") {
        return res.status(400).json({
          success: false,
          message: `Leg ${currentLeg.legNo} currently ${currentLeg.legStatus}`,
        });
      }

      // =========================
      // LOADING VALIDATION
      // =========================

      if (!req.body.loadingStartTime || !req.body.loadingEndTime) {
        return res.status(400).json({
          success: false,
          message: "Loading start time and loading end time are required",
        });
      }

      // =========================
      // UPDATE CURRENT LEG LOADING
      // =========================

      currentLeg.loading = {
        loadingStartTime: req.body.loadingStartTime,
        loadingEndTime: req.body.loadingEndTime,
        loadedWeight: req.body.loadedWeight,
        loadedBy: req.body.loadedBy,
        remarks: req.body.remarks,
        status: "Completed",
      };

      // =========================
      // UPDATE LEG STATUS
      // =========================

      currentLeg.legStatus = "Documents Pending";

      // =========================
      // UPDATE TRIP STATUS
      // =========================

      trip.tripStatus = "Documents Pending";

      await trip.save();

      return res.status(200).json({
        success: true,
        message: `Loading completed successfully for Leg ${currentLeg.legNo}`,
        data: trip,
      });
    }

    // =====================================================
    // NON MULTI LEG
    // =====================================================

    if (trip.tripStatus !== "Reached Pickup") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // =========================
    // GLOBAL LOADING
    // =========================

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

    return res.status(200).json({
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
    const driverId = req.driver.driverId;

    const { tripId } = req.params;
    const { startOdometer } = req.body;

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

    // =====================================
    // CURRENT LEG
    // =====================================

    const currentLegIndex = trip.currentLeg - 1;
    const currentLeg = trip.journeyLegs[currentLegIndex];

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: `Current leg ${trip.currentLeg} not found`,
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
    // CURRENT LEG STATUS
    // =====================================

    if (currentLeg.legStatus !== "Ready To Start") {
      return res.status(400).json({
        success: false,
        message: `Leg ${currentLeg.legNo} currently ${currentLeg.legStatus}`,
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
    // START ODOMETER
    // =====================================

    // if (startOdometer === undefined || startOdometer === null) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Start odometer reading is required",
    //   });
    // }

    // if (Number(startOdometer) < 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Start odometer cannot be negative",
    //   });
    // }

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

      // Current VendorVehicle enum is:
      // Available, On Trip, Inactive
      //
      // If you have added "Reserved" to the schema,
      // change this check to Reserved.

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
      _id: currentLeg.driver1,
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

    if (currentLeg.driver2) {
      driver2 = await Driver.findOne({
        _id: currentLeg.driver2,
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
    // VERIFY REQUEST DRIVER
    // =====================================

    const isAssignedDriver =
      currentLeg.driver1?.toString() === driverId.toString() ||
      currentLeg.driver2?.toString() === driverId.toString();

    if (!isAssignedDriver) {
      return res.status(403).json({
        success: false,
        message:
          "Only the assigned driver of the current leg can start the trip",
      });
    }

    // =====================================
    // UPDATE CURRENT LEG
    // =====================================

    currentLeg.startTime = new Date();
    currentLeg.startOdometer = Number(startOdometer);
    currentLeg.legStatus = "In Transit";

    // =====================================
    // UPDATE TRIP
    // =====================================

    trip.tripStatus = "In Transit";

    await trip.save();

    // =====================================
    // VEHICLE STATUS
    // =====================================

    if (trip.fleetSource === "Own Fleet") {
      await Vehicle.findOneAndUpdate(
        {
          _id: trip.vehicleId,
          businessId,
        },
        {
          status: "On Trip",
        },
      );
    }

    if (trip.fleetSource === "Vendor") {
      await VendorVehicle.findOneAndUpdate(
        {
          _id: trip.vendorVehicleId,
          businessId,
        },
        {
          status: "On Trip",
        },
      );
    }

    // =====================================
    // DRIVER STATUS
    // =====================================

    await Driver.findOneAndUpdate(
      {
        _id: currentLeg.driver1,
        businessId,
      },
      {
        availableStatus: "On Trip",
      },
    );

    if (currentLeg.driver2) {
      await Driver.findOneAndUpdate(
        {
          _id: currentLeg.driver2,
          businessId,
        },
        {
          availableStatus: "On Trip",
        },
      );
    }

    return res.status(200).json({
      success: true,
      message: `Trip started successfully for Leg ${currentLeg.legNo}`,
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        currentLeg: trip.currentLeg,
        tripStatus: trip.tripStatus,
        legStatus: currentLeg.legStatus,
        startTime: currentLeg.startTime,
        startOdometer: currentLeg.startOdometer,
        driver1: currentLeg.driver1,
        driver2: currentLeg.driver2,
      },
    });
  } catch (error) {
    console.error("startTrip error:", error);

    return res.status(500).json({
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

    // -------------------------------------------------
    // FIND TRIP
    // -------------------------------------------------
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

    // -------------------------------------------------
    // TRIP STATUS VALIDATION
    // -------------------------------------------------
    if (trip.tripStatus !== "In Transit") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // -------------------------------------------------
    // GET CURRENT LEG
    // -------------------------------------------------
    const currentLegIndex = trip.currentLeg - 1;
    const currentLeg = trip.journeyLegs[currentLegIndex];

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: "Invalid current leg",
      });
    }

    // -------------------------------------------------
    // CURRENT LEG STATUS VALIDATION
    // -------------------------------------------------
    if (currentLeg.legStatus !== "In Transit") {
      return res.status(400).json({
        success: false,
        message: `Current leg currently ${currentLeg.legStatus}`,
      });
    }

    // -------------------------------------------------
    // ARRIVAL ODOMETER VALIDATION
    // -------------------------------------------------
    if (
      arrivalOdometer === undefined ||
      arrivalOdometer === null ||
      isNaN(arrivalOdometer) ||
      Number(arrivalOdometer) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid arrivalOdometer is required",
      });
    }

    // -------------------------------------------------
    // UPDATE CURRENT LEG
    // -------------------------------------------------
    currentLeg.arrivalTime = new Date();

    currentLeg.arrivalOdometer = Number(arrivalOdometer);

    if (remarks !== undefined) {
      currentLeg.arrivalRemarks = remarks;
    }

    currentLeg.legStatus = "Unloading";

    // -------------------------------------------------
    // UPDATE TRIP STATUS
    // -------------------------------------------------
    trip.tripStatus = "Unloading";

    await trip.save();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------
    return res.status(200).json({
      success: true,
      message: `Vehicle arrived at destination for Leg ${currentLeg.legNo}`,
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        currentLeg: trip.currentLeg,
        tripStatus: trip.tripStatus,
        legNo: currentLeg.legNo,
        legStatus: currentLeg.legStatus,
        arrivalTime: currentLeg.arrivalTime,
        arrivalOdometer: currentLeg.arrivalOdometer,
        arrivalRemarks: currentLeg.arrivalRemarks,
      },
    });
  } catch (error) {
    console.error("arriveDestination error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Complete Unloading
// =====================================================
// COMPLETE UNLOADING
// Current Leg: Unloading → Delivery OTP Pending
// OR
// Multi Leg: Current Leg Completed → Next Leg Pre Trip Pending
// =====================================================

exports.completeUnloading = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { tripId } = req.params;

    const {
      unloadingBy,
      receiverName,
      receiverMobile,
      remarks,
    } = req.body;

    // -------------------------------------------------
    // FIND TRIP
    // -------------------------------------------------
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

    // -------------------------------------------------
    // TRIP STATUS VALIDATION
    // -------------------------------------------------
    if (trip.tripStatus !== "Unloading") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // -------------------------------------------------
    // GET CURRENT LEG
    // -------------------------------------------------
    const currentLegIndex = trip.currentLeg - 1;
    const leg = trip.journeyLegs[currentLegIndex];

    if (!leg) {
      return res.status(404).json({
        success: false,
        message: "Current journey leg not found",
      });
    }

    // -------------------------------------------------
    // CURRENT LEG STATUS VALIDATION
    // -------------------------------------------------
    if (leg.legStatus !== "Unloading") {
      return res.status(400).json({
        success: false,
        message: `Current leg currently ${leg.legStatus}`,
      });
    }


    // -------------------------------------------------
    // COMPLETE UNLOADING OF CURRENT LEG
    // -------------------------------------------------
    leg.unloading = {
      status: "Completed",
      completedAt: new Date(),
      unloadingBy,
      remarks,
    };

    // -------------------------------------------------
    // CURRENT LEG DISTANCE
    // Start → Arrival
    // -------------------------------------------------
    if (
      leg.arrivalOdometer !== undefined
    ) {
      leg.distanceTravelled =
        Number(leg.arrivalOdometer) 
    }

    // -------------------------------------------------
    // COMPLETE CURRENT LEG
    // -------------------------------------------------
    leg.legStatus = "Completed";
    leg.completedAt = new Date();


    // =================================================
    // RELEASE CURRENT LEG DRIVER 1
    // =================================================

    if (leg.driver1) {
      await Driver.findOneAndUpdate(
        {
          _id: leg.driver1,
          businessId,
          currentTripId: trip._id,
        },
        {
          $set: {
            availableStatus: "Available",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // =================================================
    // RELEASE CURRENT LEG DRIVER 2
    // =================================================

    if (leg.driver2) {
      await Driver.findOneAndUpdate(
        {
          _id: leg.driver2,
          businessId,
          currentTripId: trip._id,
        },
        {
          $set: {
            availableStatus: "Available",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    const totalLegs = trip.journeyLegs.length;

    // =================================================
    // MORE LEGS AVAILABLE
    // =================================================

    if (trip.currentLeg < totalLegs) {
      trip.currentLeg = trip.currentLeg + 1;

      const nextLegIndex = trip.currentLeg - 1;
      const nextLeg = trip.journeyLegs[nextLegIndex];

      if (!nextLeg) {
        return res.status(400).json({
          success: false,
          message: "Next journey leg not found",
        });
      }

      // ------------------------------------------------
      // NEXT LEG STARTS FROM PRE TRIP PENDING
      // ------------------------------------------------
      nextLeg.legStatus = "Pre Trip Pending";

      trip.tripStatus = "Pre Trip Pending";
    }

    // =================================================
    // FINAL LEG COMPLETED
    // =================================================

    else {
      trip.tripStatus = "Completed";
      trip.completedAt = new Date();
    }

    // -------------------------------------------------
    // SAVE TRIP
    // -------------------------------------------------
    await trip.save();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------
    return res.status(200).json({
      success: true,
      message:
        trip.currentLeg < totalLegs
          ? `Unloading completed for Leg ${leg.legNo}. Ready for Leg ${trip.currentLeg}.`
          : "Unloading completed.",
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        currentLeg: trip.currentLeg,
        tripStatus: trip.tripStatus,

        completedLeg: {
          legNo: leg.legNo,
          legStatus: leg.legStatus,
          unloading: leg.unloading,
          distanceTravelled: leg.distanceTravelled,
          completedAt: leg.completedAt,
        },

        nextLeg:
          trip.currentLeg < totalLegs
            ? {
                legNo: trip.currentLeg,
                legStatus:
                  trip.journeyLegs[trip.currentLeg - 1]
                    .legStatus,
              }
            : null,
      },
    });
  } catch (error) {
    console.error("completeUnloading error:", error);

    return res.status(500).json({
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

    trip.tripStatus = "Completed";

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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    trip.deliveryOtp = otp;

    trip.deliveryOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);

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
    const { tripId } = req.params;

    // -------------------------------------------------
    // FIND TRIP
    // -------------------------------------------------
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

    // -------------------------------------------------
    // TRIP MUST BE COMPLETED
    // -------------------------------------------------
    if (trip.tripStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // -------------------------------------------------
    // ALL JOURNEY LEGS MUST BE COMPLETED
    // -------------------------------------------------
    const pendingLeg = trip.journeyLegs.find(
      (leg) => leg.legStatus !== "Completed"
    );

    if (pendingLeg) {
      return res.status(400).json({
        success: false,
        message:
          `Journey Leg ${pendingLeg.legNo} is not completed`,
      });
    }

    // -------------------------------------------------
    // POST TRIP INSPECTION
    // -------------------------------------------------
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

    // -------------------------------------------------
    // POST TRIP INSPECTION MUST BE PASSED
    // -------------------------------------------------
    if (inspection.inspectionStatus !== "Passed") {
      return res.status(400).json({
        success: false,
        message:
          "Post Trip Inspection must be passed before closing the trip",
      });
    }

    // =================================================
    // CLOSE TRIP
    // =================================================

    trip.tripStatus = "Closed";
    trip.closedAt = new Date();

    await trip.save();

    // =================================================
    // VEHICLE AVAILABLE
    // =================================================

    if (trip.fleetSource === "Own Fleet" && trip.vehicleId) {
      await Vehicle.findOneAndUpdate(
        {
          _id: trip.vehicleId,
          businessId,
        },
        {
          $set: {
            status: "Available",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // =================================================
    // VENDOR VEHICLE AVAILABLE
    // =================================================

    if (trip.fleetSource === "Vendor" && trip.vendorVehicleId) {
      await VendorVehicle.findOneAndUpdate(
        {
          _id: trip.vendorVehicleId,
        },
        {
          $set: {
            status: "Available",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // =================================================
    // CUSTOMER DASHBOARD
    // =================================================
    //
    // Customer is now stored per journey leg.
    // A trip may contain multiple customer legs.
    //
    // Update each customer's dashboard based on
    // the freight amount of that leg.
    // =================================================

    for (const leg of trip.journeyLegs) {
      if (leg.customerId) {
        await Customer.findOneAndUpdate(
          {
            _id: leg.customerId,
            businessId,
          },
          {
            $inc: {
              totalTrips: 1,
              totalRevenue: leg.estimatedFreightAmount || 0,
            },
          }
        );
      }
    }

    // =================================================
    // BROKER DASHBOARD
    // =================================================
    //
    // Broker is also stored per journey leg.
    //
    // Only legs coming through a broker are updated.
    // =================================================

    for (const leg of trip.journeyLegs) {
      if (leg.brokerId) {
        await Broker.findOneAndUpdate(
          {
            _id: leg.brokerId,
            businessId,
          },
          {
            $inc: {
              totalTrips: 1,
              totalCommission: leg.commissionAmount || 0,
            },
          }
        );
      }
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message: "Trip closed successfully",
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        tripStatus: trip.tripStatus,
        completedAt: trip.completedAt,
        closedAt: trip.closedAt,
        totalLegs: trip.journeyLegs.length,
      },
    });
  } catch (error) {
    console.error("closeTrip error:", error);

    return res.status(500).json({
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
        `trip-documents/${tripId}`,
      );

      if (existingDocument) {
        // Delete old file from GCS
        if (existingDocument.filePath) {
          await deleteFile(existingDocument.filePath, businessId);
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

        fileUrl: await getSignedUrl(doc.filePath, businessId),
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
        await deleteFile(oldFilePath, businessId);
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
    await deleteFile(document.filePath, businessId);

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
      uom,
      ticketNumber,
      weighbridgeName,
      weighbridgeFee,
      remarks,
    } = req.body;

    // =========================================================
    // FIND TRIP
    // =========================================================

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

    // =========================================================
    // GET CURRENT LEG
    // =========================================================

    const currentLegIndex = trip.currentLeg - 1;

    const currentLeg = trip.journeyLegs[currentLegIndex];

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: `Current leg ${trip.currentLeg} not found`,
      });
    }

    // =========================================================
    // TRIP STATUS CHECK
    // =========================================================

    if (trip.tripStatus !== "Documents Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // =========================================================
    // CURRENT LEG STATUS CHECK
    // =========================================================

    if (currentLeg.legStatus !== "Documents Pending") {
      return res.status(400).json({
        success: false,
        message: `Leg ${currentLeg.legNo} currently ${currentLeg.legStatus}`,
      });
    }

    // =========================================================
    // PREVENT DUPLICATE WEIGHBRIDGE
    // =========================================================

    if (
      currentLeg.weighbridge &&
      currentLeg.weighbridge.status === "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message: `Weighbridge details already submitted for Leg ${currentLeg.legNo}`,
      });
    }

    // =========================================================
    // DRIVER VALIDATION
    // =========================================================

    const isDriverAssigned =
      currentLeg.driver1?.toString() === driverId.toString() ||
      currentLeg.driver2?.toString() === driverId.toString();

    if (!isDriverAssigned) {
      return res.status(403).json({
        success: false,
        message:
          "Only the assigned driver of the current leg can complete the weighbridge process",
      });
    }

    // =========================================================
    // RECEIPT VALIDATION
    // =========================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Weighbridge receipt is required",
      });
    }

    // =========================================================
    // UPLOAD WEIGHBRIDGE RECEIPT
    // =========================================================

    const receiptPath = await uploadFile(
      req.file,
      businessId,
      `trip-documents/${tripId}/leg-${currentLeg.legNo}/weighbridge`,
    );

    // =========================================================
    // SAVE WEIGHBRIDGE TO CURRENT LEG
    // =========================================================

    currentLeg.weighbridge = {
      status: "Completed",

      grossWeight,

      uom,

      ticketNumber,

      weighbridgeName,

      weighbridgeFee,

      receiptPath,

      remarks,

      measuredAt: new Date(),

      measuredBy: driverId,
    };

    // =========================================================
    // UPDATE CURRENT LEG STATUS
    // =========================================================

    currentLeg.legStatus = "Ready To Start";

    // =========================================================
    // UPDATE TRIP STATUS
    // =========================================================

    trip.tripStatus = "Ready To Start";

    // =========================================================
    // SAVE
    // =========================================================

    await trip.save();

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,
      message: `Weighbridge completed successfully for Leg ${currentLeg.legNo}`,
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        currentLeg: trip.currentLeg,
        tripStatus: trip.tripStatus,
        legStatus: currentLeg.legStatus,
        weighbridge: currentLeg.weighbridge,
      },
    });
  } catch (error) {
    console.error("completeWeighbridge error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getWeighbridge = async (req, res) => {
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

    // Get current leg
    const currentLegIndex = trip.currentLeg - 1;
    const currentLeg = trip.journeyLegs[currentLegIndex];

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: `Current leg ${trip.currentLeg} not found`,
      });
    }

    // Check weighbridge details
    if (
      !currentLeg.weighbridge ||
      currentLeg.weighbridge.status !== "Completed"
    ) {
      return res.status(404).json({
        success: false,
        message: `Weighbridge details not found for Leg ${currentLeg.legNo}`,
      });
    }

    // Generate signed receipt URL only when receipt exists
    let receiptUrl = null;

    if (currentLeg.weighbridge.receiptPath) {
      receiptUrl = await getSignedUrl(
        currentLeg.weighbridge.receiptPath,
        businessId,
      );
    }

    const weighbridge = {
      ...currentLeg.weighbridge.toObject(),
      receiptUrl,
    };

    return res.status(200).json({
      success: true,
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        currentLeg: trip.currentLeg,
        legNo: currentLeg.legNo,
        tripStatus: trip.tripStatus,
        legStatus: currentLeg.legStatus,
        weighbridge,
      },
    });
  } catch (error) {
    console.error("getWeighbridge error:", error);

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
      uom,
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

    // Get current leg
    const currentLegIndex = trip.currentLeg - 1;
    const currentLeg = trip.journeyLegs[currentLegIndex];

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: `Current leg ${trip.currentLeg} not found`,
      });
    }

    // Weighbridge must already be completed
    if (
      !currentLeg.weighbridge ||
      currentLeg.weighbridge.status !== "Completed"
    ) {
      return res.status(404).json({
        success: false,
        message: `Weighbridge details not found for Leg ${currentLeg.legNo}`,
      });
    }

    // Only current-leg assigned driver can update
    const isDriverAssigned =
      currentLeg.driver1?.toString() === driverId.toString() ||
      currentLeg.driver2?.toString() === driverId.toString();

    if (!isDriverAssigned) {
      return res.status(403).json({
        success: false,
        message:
          "Only the assigned driver of the current leg can update weighbridge",
      });
    }

    // Keep existing receipt if no new file is uploaded
    let receiptPath = currentLeg.weighbridge.receiptPath;

    if (req.file) {
      receiptPath = await replaceFile(
        req.file,
        businessId,
        `trip-documents/${tripId}/leg-${currentLeg.legNo}/weighbridge`,
        currentLeg.weighbridge.receiptPath,
      );
    }

    // Update only provided values
    if (grossWeight !== undefined) {
      currentLeg.weighbridge.grossWeight = grossWeight;
    }

    if (uom !== undefined) {
      currentLeg.weighbridge.uom = uom;
    }

    if (ticketNumber !== undefined) {
      currentLeg.weighbridge.ticketNumber = ticketNumber;
    }

    if (weighbridgeName !== undefined) {
      currentLeg.weighbridge.weighbridgeName = weighbridgeName;
    }

    if (weighbridgeFee !== undefined) {
      currentLeg.weighbridge.weighbridgeFee = weighbridgeFee;
    }

    if (remarks !== undefined) {
      currentLeg.weighbridge.remarks = remarks;
    }

    if (req.file) {
      currentLeg.weighbridge.receiptPath = receiptPath;
    }

    currentLeg.weighbridge.measuredAt = new Date();
    currentLeg.weighbridge.measuredBy = driverId;

    await trip.save();

    return res.status(200).json({
      success: true,
      message: `Weighbridge updated successfully for Leg ${currentLeg.legNo}`,
      data: {
        tripId: trip._id,
        tripNo: trip.tripNo,
        currentLeg: trip.currentLeg,
        tripStatus: trip.tripStatus,
        legStatus: currentLeg.legStatus,
        weighbridge: currentLeg.weighbridge,
      },
    });
  } catch (error) {
    console.error("updateWeighbridge error:", error);

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

    if (!quantity || !rate) {
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

          billUrl: fuel.billPath
            ? await getSignedUrl(fuel.billPath, businessId)
            : null,
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

    response.billUrl = fuel.billPath
      ? await getSignedUrl(fuel.billPath, businessId)
      : null;

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

    const { receiverName, receiverMobile, podNumber, remarks } = req.body;

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

    if (!receiverName || !receiverMobile || !podNumber) {
      return res.status(400).json({
        success: false,
        message: "Receiver name, receiver mobile and POD number are required",
      });
    }

    if (!req.files || !req.files.pod) {
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
      `trip-documents/${tripId}/pod`,
    );

    // Invoice (Optional)

    let invoicePath = null;

    if (req.files.invoice) {
      invoicePath = await uploadFile(
        req.files.invoice[0],
        businessId,
        `trip-documents/${tripId}/pod`,
      );
    }

    // Delivery Challan (Optional)

    let deliveryChallanPath = null;

    if (req.files.deliveryChallan) {
      deliveryChallanPath = await uploadFile(
        req.files.deliveryChallan[0],
        businessId,
        `trip-documents/${tripId}/pod`,
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

/* =========================================
  Trip Expense
==========================================*/
exports.createTripExpense = async (req, res) => {
  try {
    const { businessId, driverId } = req.driver;
    const { tripId } = req.params;

    const { expenseType, amount } = req.body;

    // Validate Trip
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

    // Validate Expense Type
    const allowedExpenseTypes = [
      "Loading",
      "Unloading",
      "Parking",
      "Repair",
      "Miscellaneous",
    ];

    if (!allowedExpenseTypes.includes(expenseType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense type",
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Expense amount is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Expense bill is required",
      });
    }

    // Allow only one Loading & Unloading expense
    if (["Loading", "Unloading"].includes(expenseType)) {
      const existingExpense = await TripExpense.findOne({
        businessId,
        tripId,
        expenseType,
      });

      if (existingExpense) {
        return res.status(400).json({
          success: false,
          message: `${expenseType} expense already uploaded`,
        });
      }
    }

    // Upload Bill
    const billPath = await uploadFile(
      req.file,
      businessId,
      `trip-expenses/${tripId}/${expenseType.toLowerCase()}`,
    );

    // Create Expense
    const expense = await TripExpense.create({
      businessId,
      tripId,
      driverId,
      expenseType,
      amount,
      filePath: billPath,
    });

    return res.status(201).json({
      success: true,
      message: `${expenseType} expense uploaded successfully`,
      data: expense,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripExpenses = async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.driver?.businessId;
    const { tripId } = req.params;

    const expenses = await TripExpense.find({
      businessId,
      tripId,
    }).sort({
      createdAt: -1,
    });

    const data = await Promise.all(
      expenses.map(async (expense) => {
        const obj = expense.toObject();

        obj.billUrl = obj.filePath
          ? await getSignedUrl(obj.filePath, businessId)
          : null;

        return obj;
      }),
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateTripExpense = async (req, res) => {
  try {
    const { businessId } = req.driver;
    const { expenseId } = req.params;

    const expense = await TripExpense.findOne({
      _id: expenseId,
      businessId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (req.body.amount) {
      expense.amount = req.body.amount;
    }

    if (req.file) {
      const oldBill = expense.filePath;

      const newBill = await uploadFile(
        req.file,
        businessId,
        `trip-expenses/${expense.tripId}/${expense.expenseType.toLowerCase()}`,
      );

      expense.filePath = newBill;

      if (oldBill) {
        await deleteFile(oldBill, businessId);
      }
    }

    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteTripExpense = async (req, res) => {
  try {
    const { businessId } = req.driver;
    const { expenseId } = req.params;

    const expense = await TripExpense.findOne({
      _id: expenseId,
      businessId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.filePath) {
      await deleteFile(expense.filePath, businessId);
    }

    await TripExpense.findByIdAndDelete(expenseId);

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*=========================================
    Ledger
==========================================*/
// single trip ledger
exports.getTripLedger = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      businessId,
    })
      .populate("vehicleId", "regNo")
      .populate("driver1", "driverName");
    // console.log("trips:", trip);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    //--------------------------------------------------
    // Fuel summary
    //--------------------------------------------------
    const fuelCost = Number(trip.totalFuelCost || 0);

    const fuelQuantity = Number(trip.totalFuelQuantity || 0);

    const totalFuelEntries = Number(trip.totalFuelEntries || 0);

    //--------------------------------------------------
    // Trip Expenses
    //--------------------------------------------------

    const expenses = await TripExpense.find({
      businessId,
      tripId,
    });

    const getExpense = (type) =>
      expenses
        .filter((x) => x.expenseType === type)
        .reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const loadingExpense = getExpense("Loading");

    const unloadingExpense = getExpense("Unloading");

    const parkingExpense = getExpense("Parking");

    const repairExpense = getExpense("Repair");

    const miscellaneousExpense = getExpense("Miscellaneous");

    //--------------------------------------------------
    // Weighbridge
    //--------------------------------------------------

    const weighbridgeExpense = Number(trip.weighbridge?.weighbridgeFee || 0);

    //--------------------------------------------------
    // Total Expense
    //--------------------------------------------------

    const totalExpense =
      fuelCost +
      loadingExpense +
      unloadingExpense +
      parkingExpense +
      repairExpense +
      miscellaneousExpense +
      weighbridgeExpense;

    //--------------------------------------------------
    // Profit
    //--------------------------------------------------

    const freightAmount = Number(trip.freightAmount || 0);

    const profit = freightAmount - totalExpense;

    //--------------------------------------------------
    // Driver Settlement
    //--------------------------------------------------

    const advance = Number(trip.driverAdvance || 0);

    let officeShouldPayDriver = 0;
    let driverShouldReturn = 0;

    if (totalExpense > advance) {
      officeShouldPayDriver = totalExpense - advance;
    } else {
      driverShouldReturn = advance - totalExpense;
    }

    //--------------------------------------------------
    const round = (value) => Number(value.toFixed(2));

    return res.status(200).json({
      success: true,

      data: {
        trip: {
          tripId: trip._id,
          tripNo: trip.tripNo,
          tripStatus: trip.tripStatus,
          vehicle: trip.vehicleId,
          driver: trip.driver1,
        },

        income: {
          freightAmount: round(freightAmount),
        },

        expenses: {
          driverAdvance: round(advance),
          fuelCost: round(fuelCost),
          fuelQuantity,
          totalFuelEntries,
          loadingExpense: round(loadingExpense),
          unloadingExpense: round(unloadingExpense),
          parkingExpense: round(parkingExpense),
          repairExpense: round(repairExpense),
          miscellaneousExpense: round(miscellaneousExpense),
          weighbridgeExpense: round(weighbridgeExpense),
        },

        summary: {
          totalExpense: round(totalExpense),
          profit: round(profit),
        },

        driverSettlement: {
          advanceGiven: round(advance),
          actualExpense: round(totalExpense),
          officeShouldPayDriver: round(officeShouldPayDriver),
          driverShouldReturn: round(driverShouldReturn),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// All over trips dashboard
exports.getLedgerDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const trips = await Trip.find({
      businessId,
    }).lean();

    const tripIds = trips.map((t) => t._id);

    const expenses = await TripExpense.find({
      businessId,
      tripId: { $in: tripIds },
    }).lean();

    let freight = 0;

    let driverAdvance = 0;

    let fuel = 0;

    let loading = 0;

    let unloading = 0;

    let parking = 0;

    let repair = 0;

    let miscellaneous = 0;

    let weighbridge = 0;

    let officeShouldPay = 0;

    let driverShouldReturn = 0;

    trips.forEach((trip) => {
      freight += Number(trip.freightAmount || 0);

      driverAdvance += Number(trip.driverAdvance || 0);

      fuel += Number(trip.totalFuelCost || 0);

      weighbridge += Number(trip.weighbridge?.weighbridgeFee || 0);
    });

    expenses.forEach((expense) => {
      switch (expense.expenseType) {
        case "Loading":
          loading += Number(expense.amount || 0);
          break;

        case "Unloading":
          unloading += Number(expense.amount || 0);
          break;

        case "Parking":
          parking += Number(expense.amount || 0);
          break;

        case "Repair":
          repair += Number(expense.amount || 0);
          break;

        case "Miscellaneous":
          miscellaneous += Number(expense.amount || 0);
          break;
      }
    });

    const totalExpense =
      fuel +
      loading +
      unloading +
      parking +
      repair +
      miscellaneous +
      weighbridge;

    const profit = freight - totalExpense;

    trips.forEach((trip) => {
      const loadingExpense = expenses
        .filter(
          (e) =>
            e.tripId.toString() === trip._id.toString() &&
            e.expenseType === "Loading",
        )
        .reduce((a, b) => a + Number(b.amount), 0);

      const unloadingExpense = expenses
        .filter(
          (e) =>
            e.tripId.toString() === trip._id.toString() &&
            e.expenseType === "Unloading",
        )
        .reduce((a, b) => a + Number(b.amount), 0);

      const parkingExpense = expenses
        .filter(
          (e) =>
            e.tripId.toString() === trip._id.toString() &&
            e.expenseType === "Parking",
        )
        .reduce((a, b) => a + Number(b.amount), 0);

      const repairExpense = expenses
        .filter(
          (e) =>
            e.tripId.toString() === trip._id.toString() &&
            e.expenseType === "Repair",
        )
        .reduce((a, b) => a + Number(b.amount), 0);

      const miscExpense = expenses
        .filter(
          (e) =>
            e.tripId.toString() === trip._id.toString() &&
            e.expenseType === "Miscellaneous",
        )
        .reduce((a, b) => a + Number(b.amount), 0);

      const actualExpense =
        fuel +
        loadingExpense +
        unloadingExpense +
        parkingExpense +
        repairExpense +
        miscExpense +
        Number(trip.weighbridge?.weighbridgeFee || 0);

      if (actualExpense > trip.driverAdvance) {
        officeShouldPay += actualExpense - trip.driverAdvance;
      } else {
        driverShouldReturn += trip.driverAdvance - actualExpense;
      }
    });

    const round = (value) => Number(value.toFixed(2));

    res.status(200).json({
      success: true,
      data: {
        income: {
          freight: round(freight),
        },
        expenses: {
          driverAdvance: round(driverAdvance),
          fuel: round(fuel),
          loading: round(loading),
          unloading: round(unloading),
          parking: round(parking),
          repair: round(repair),
          miscellaneous: round(miscellaneous),
          weighbridge: round(weighbridge),
        },
        summary: {
          totalTrips: trips.length,
          completedTrips: trips.filter((t) => t.tripStatus === "Completed")
            .length,
          runningTrips: trips.filter((t) => t.tripStatus !== "Completed")
            .length,
          totalExpense: round(totalExpense),
          profit: round(profit),
        },
        driverSettlement: {
          officeShouldPay: round(officeShouldPay),
          driverShouldReturn: round(driverShouldReturn),
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// customer ledger
exports.getCustomerLedger = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const trips = await Trip.find({
      businessId,
      "journeyLegs.customerId": { $exists: true, $ne: null },
    })
      .populate("journeyLegs.customerId", "customerName companyName")
      .lean();

    const ledger = {};

    trips.forEach((trip) => {
      trip.journeyLegs.forEach((leg) => {
        if (!leg.customerId) return;

        const customer = leg.customerId;

        const customerId = customer._id.toString();

        if (!ledger[customerId]) {
          ledger[customerId] = {
            customerId,
            customerName: customer.companyName || customer.customerName,

            totalTrips: 0,

            freightAmount: 0,

            receivedAmount: 0,

            balance: 0,
          };
        }

        ledger[customerId].totalTrips += 1;

        // Assumption:
        // One customer per trip.
        // If one trip has multiple customers,
        // later we'll allocate freight per leg.
        ledger[customerId].freightAmount += Number(trip.freightAmount || 0);

        ledger[customerId].balance =
          ledger[customerId].freightAmount - ledger[customerId].receivedAmount;
      });
    });

    return res.status(200).json({
      success: true,
      data: Object.values(ledger),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCustomerLedgerById = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId).select(
      "customerName companyName",
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const trips = await Trip.find({
      businessId,
      "journeyLegs.customerId": customerId,
    })
      .populate("vehicleId", "regNo")
      .populate("driver1", "driverName")
      .sort({ createdAt: -1 })
      .lean();

    const data = trips.map((trip) => {
      const freight = Number(trip.freightAmount || 0);
      const received = 0;

      return {
        tripId: trip._id,

        tripNo: trip.tripNo,

        lrNo: trip.lrNo,

        tripDate: trip.createdAt,

        vehicleNo: trip.vehicleId?.regNo || "-",

        driverName: trip.driver1?.driverName || "-",

        origin: trip.origin?.location || "-",

        destination: trip.destination?.location || "-",

        tripStatus: trip.tripStatus,

        freightAmount: freight,

        receivedAmount: received,

        balance: freight - received,

        paymentStatus: received >= freight ? "Paid" : "Pending",
      };
    });

    const totalFreight = data.reduce(
      (sum, trip) => sum + trip.freightAmount,
      0,
    );

    const totalReceived = data.reduce(
      (sum, trip) => sum + trip.receivedAmount,
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        customer: {
          customerId,
          customerName: customer.companyName || customer.customerName,
        },

        summary: {
          totalTrips: data.length,

          freightAmount: totalFreight,

          receivedAmount: totalReceived,

          balance: totalFreight - totalReceived,
        },

        trips: data,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// broker ledger
exports.getBrokerLedger = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const trips = await Trip.find({
      businessId,
      "journeyLegs.brokerId": { $exists: true, $ne: null },
    })
      .populate("journeyLegs.brokerId", "brokerName companyName")
      .lean();

    const ledger = {};

    trips.forEach((trip) => {
      const processedBrokers = new Set();

      trip.journeyLegs.forEach((leg) => {
        if (!leg.brokerId) return;

        const broker = leg.brokerId;
        const brokerId = broker._id.toString();

        // Prevent duplicate counting if the same broker appears
        // in multiple legs of the same trip.
        if (processedBrokers.has(brokerId)) return;

        processedBrokers.add(brokerId);

        if (!ledger[brokerId]) {
          ledger[brokerId] = {
            brokerId,
            brokerName: broker.companyName || broker.brokerName,

            totalTrips: 0,

            payableAmount: 0,

            paidAmount: 0,

            balance: 0,
          };
        }

        ledger[brokerId].totalTrips += 1;

        // Until broker payment module is ready
        ledger[brokerId].payableAmount += Number(trip.freightAmount || 0);

        ledger[brokerId].balance =
          ledger[brokerId].payableAmount - ledger[brokerId].paidAmount;
      });
    });

    return res.status(200).json({
      success: true,
      data: Object.values(ledger),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBrokerLedgerById = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { brokerId } = req.params;

    const broker = await Broker.findById(brokerId).select(
      "brokerName companyName",
    );

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const trips = await Trip.find({
      businessId,
      "journeyLegs.brokerId": brokerId,
    })
      .populate("vehicleId", "regNo")
      .populate("driver1", "driverName")
      .sort({ createdAt: -1 })
      .lean();

    const data = trips.map((trip) => {
      const payable = Number(trip.freightAmount || 0);
      const paid = 0;

      return {
        tripId: trip._id,

        tripNo: trip.tripNo,

        lrNo: trip.lrNo,

        tripDate: trip.createdAt,

        vehicleNo: trip.vehicleId?.regNo || "-",

        driverName: trip.driver1?.driverName || "-",

        origin: trip.origin?.location || "-",

        destination: trip.destination?.location || "-",

        tripStatus: trip.tripStatus,

        payableAmount: payable,

        paidAmount: paid,

        balance: payable - paid,

        paymentStatus: paid >= payable ? "Paid" : "Pending",
      };
    });

    const totalPayable = data.reduce(
      (sum, trip) => sum + trip.payableAmount,
      0,
    );

    const totalPaid = data.reduce((sum, trip) => sum + trip.paidAmount, 0);

    return res.status(200).json({
      success: true,
      data: {
        broker: {
          brokerId,

          brokerName: broker.companyName || broker.brokerName,
        },

        summary: {
          totalTrips: data.length,

          payableAmount: totalPayable,

          paidAmount: totalPaid,

          balance: totalPayable - totalPaid,
        },

        trips: data,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
