const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const PreTripInspection = require("../models/PreTripInspection");
const PostTripInspection = require("../models/PostTripInspection");

// validation
const validateTyres = (tyres = []) => {
  if (!Array.isArray(tyres) || tyres.length === 0) {
    return false;
  }

  return tyres.every((tyre) => {
    return (
      tyre.airPressureOK === true &&
      tyre.sideWallDamage === false &&
      tyre.puncture === false &&
      tyre.condition !== "Poor"
    );
  });
};


exports.createPreTripInspection = async (req, res) => {
  try {
    const businessId = req.driver.businessId;

    const { tripId, vehicleId, inspectedBy } = req.body;

    // =========================================================
    // VALIDATE REQUIRED FIELDS
    // =========================================================

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "tripId is required",
      });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "vehicleId is required for inspection",
      });
    }

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

    const legNo = currentLeg.legNo;

    // =========================================================
    // TRIP STATUS CHECK
    // =========================================================

    if (trip.tripStatus !== "Pre Trip Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // =========================================================
    // CURRENT LEG STATUS CHECK
    // =========================================================

    if (currentLeg.legStatus !== "Pre Trip Pending") {
      return res.status(400).json({
        success: false,
        message: `Leg ${legNo} currently ${currentLeg.legStatus}`,
      });
    }

    // =========================================================
    // VEHICLE VALIDATION
    // =========================================================

    if (
      trip.fleetSource === "Own Fleet" &&
      trip.vehicleId?.toString() !== vehicleId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Inspection vehicle does not match trip vehicle",
      });
    }

    if (
      trip.fleetSource === "Vendor" &&
      trip.vendorVehicleId?.toString() !== vehicleId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Inspection vehicle does not match vendor vehicle",
      });
    }

    // =========================================================
    // DUPLICATE INSPECTION CHECK FOR CURRENT LEG ONLY
    // =========================================================

    const existingInspection = await PreTripInspection.findOne({
      tripId,
      businessId,
      legNo,
    });

    if (existingInspection) {
      return res.status(400).json({
        success: false,
        message: `Pre-trip inspection already exists for Leg ${legNo}`,
      });
    }

    // =========================================================
    // INSPECTION CHECKS
    // =========================================================

    const checks = [
      req.body.engineOil,
      req.body.coolant,
      req.body.brakes,
      validateTyres(req.body.tyres),
      req.body.lights,
      req.body.horn,
      req.body.fuel,
      req.body.documents,
      req.body.fireExtinguisher,
      req.body.firstAidKit,
    ];

    const passed = checks.every((item) => item === true);

    // =========================================================
    // CREATE INSPECTION
    // =========================================================

    const inspection = await PreTripInspection.create({
      businessId,
      tripId,
      legNo,
      vehicleId,
      inspectedBy,

      engineOil: req.body.engineOil,
      coolant: req.body.coolant,
      brakes: req.body.brakes,
      lights: req.body.lights,
      horn: req.body.horn,
      fuel: req.body.fuel,
      documents: req.body.documents,
      fireExtinguisher: req.body.fireExtinguisher,
      firstAidKit: req.body.firstAidKit,

      remarks: req.body.remarks,
      tyres: req.body.tyres,

      inspectionStatus: passed ? "Passed" : "Failed",
    });

    // =========================================================
    // UPDATE CURRENT LEG + TRIP STATUS
    // =========================================================

    if (passed) {
      currentLeg.legStatus = "Ready For Loading";
      trip.tripStatus = "Ready For Loading";
    } else {
      currentLeg.legStatus = "Pre Trip Pending";
      trip.tripStatus = "Pre Trip Pending";
    }

    await trip.save();

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(201).json({
      success: true,
      message: passed
        ? `Pre-trip inspection passed for Leg ${legNo}. Trip is ready for loading.`
        : `Pre-trip inspection failed for Leg ${legNo}. Trip remains pending.`,
      data: {
        inspection,
        trip: {
          _id: trip._id,
          tripNo: trip.tripNo,
          tripStatus: trip.tripStatus,
          currentLeg: trip.currentLeg,
          currentLegNo: currentLeg.legNo,
          currentLegStatus: currentLeg.legStatus,
        },
      },
    });
  } catch (error) {
    console.error("createPreTripInspection error:", error);

    // Handle duplicate index errors, including concurrent requests
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Pre-trip inspection already exists for this leg",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all
exports.getPreTripInspections = async (req, res) => {
  try {
    const inspections = await PreTripInspection.find({
      businessId: req.user.businessId,
    })
      .populate("tripId")
      .populate("vehicleId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: inspections.length,
      data: inspections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get One
exports.getPreTripInspection = async (req, res) => {
  try {
    const inspection = await PreTripInspection.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: "Inspection not found",
      });
    }

    res.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update pre-trip
exports.updatePreTripInspection = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { inspectionId } = req.params;

    // =========================================================
    // FIND INSPECTION
    // =========================================================

    const inspection = await PreTripInspection.findOne({
      _id: inspectionId,
      businessId,
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: "Inspection not found",
      });
    }

    // =========================================================
    // FIND TRIP
    // =========================================================

    const trip = await Trip.findOne({
      _id: inspection.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // =========================================================
    // FIND THE LEG ASSOCIATED WITH THIS INSPECTION
    // =========================================================

    const legIndex = trip.journeyLegs.findIndex(
      (leg) => leg.legNo === inspection.legNo
    );

    if (legIndex === -1) {
      return res.status(400).json({
        success: false,
        message: `Leg ${inspection.legNo} not found in this trip`,
      });
    }

    const leg = trip.journeyLegs[legIndex];

    const isCurrentLeg =
      trip.currentLeg === inspection.legNo;

    // =========================================================
    // PREVENT UPDATING CLOSED TRIPS
    // =========================================================

    if (trip.tripStatus === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot update inspection for a closed trip",
      });
    }

    // =========================================================
    // VALIDATE LEG STATUS
    // =========================================================

    if (
      leg.legStatus !== "Pre Trip Pending" &&
      leg.legStatus !== "Ready For Loading"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot update pre-trip inspection for Leg ${leg.legNo} ` +
          `because its status is ${leg.legStatus}`,
      });
    }

    // Only the current leg's inspection may change the trip status.
    // Do not allow edits to an earlier leg's inspection after
    // the trip has progressed to another leg.
    if (!isCurrentLeg) {
      return res.status(400).json({
        success: false,
        message:
          `Leg ${inspection.legNo} is not the current leg. ` +
          "Only the current leg's inspection can be updated.",
      });
    }

    // =========================================================
    // ALLOWLIST INSPECTION FIELDS
    // =========================================================

    const allowedFields = [
      "inspectedBy",
      "engineOil",
      "coolant",
      "brakes",
      "lights",
      "horn",
      "fuel",
      "documents",
      "fireExtinguisher",
      "firstAidKit",
      "remarks",
      "tyres",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        inspection[field] = req.body[field];
      }
    }

    // =========================================================
    // REVALIDATE INSPECTION
    // =========================================================

    const checks = [
      inspection.engineOil,
      inspection.coolant,
      inspection.brakes,
      validateTyres(inspection.tyres),
      inspection.lights,
      inspection.horn,
      inspection.fuel,
      inspection.documents,
      inspection.fireExtinguisher,
      inspection.firstAidKit,
    ];

    const passed = checks.every((item) => item === true);

    inspection.inspectionStatus = passed ? "Passed" : "Failed";

    await inspection.save();

    // =========================================================
    // UPDATE CURRENT LEG + TRIP STATUS
    // =========================================================

    if (passed) {
      leg.legStatus = "Ready For Loading";
      trip.tripStatus = "Ready For Loading";
    } else {
      leg.legStatus = "Pre Trip Pending";
      trip.tripStatus = "Pre Trip Pending";
    }

    await trip.save();

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,
      message: passed
        ? `Pre-trip inspection updated successfully for Leg ${leg.legNo}. Trip is ready for loading.`
        : `Pre-trip inspection failed for Leg ${leg.legNo}. Trip remains pending.`,
      data: {
        inspection,
        trip: {
          _id: trip._id,
          tripNo: trip.tripNo,
          currentLeg: trip.currentLeg,
          tripStatus: trip.tripStatus,
          currentLegStatus: leg.legStatus,
        },
      },
    });
  } catch (error) {
    console.error("updatePreTripInspection error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//=========================================
// Post Trip inspection
//=========================================
exports.postTripInspection = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { tripId, inspectedBy } = req.body;

    // =================================================
    // VALIDATE REQUIRED FIELDS
    // =================================================

    if (!tripId || !inspectedBy) {
      return res.status(400).json({
        success: false,
        message: "tripId and inspectedBy are required",
      });
    }

    // =================================================
    // FIND TRIP
    // =================================================

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

    // =================================================
    // TRIP MUST BE COMPLETED
    // =================================================

    if (trip.tripStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "Trip is not completed yet",
      });
    }

    // =================================================
    // ALL JOURNEY LEGS MUST BE COMPLETED
    // =================================================

    const pendingLeg = trip.journeyLegs.find(
      (leg) => leg.legStatus !== "Completed"
    );

    if (pendingLeg) {
      return res.status(400).json({
        success: false,
        message: `Journey Leg ${pendingLeg.legNo} is not completed`,
      });
    }

    if (!trip.journeyLegs.length) {
      return res.status(400).json({
        success: false,
        message: "No journey leg found",
      });
    }

    // =================================================
    // CHECK DUPLICATE POST-TRIP INSPECTION
    // =================================================

    const existing = await PostTripInspection.findOne({
      businessId,
      tripId: trip._id,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Post-trip inspection already exists for this trip",
      });
    }

    // =================================================
    // VALIDATE FLEET VEHICLE BEFORE CREATING INSPECTION
    // =================================================

    let vehicle = null;
    let vendorVehicle = null;

    if (trip.fleetSource === "Own Fleet") {
      if (!trip.vehicleId) {
        return res.status(400).json({
          success: false,
          message: "Own Fleet trip has no vehicle assigned",
        });
      }

      vehicle = await Vehicle.findOne({
        _id: trip.vehicleId,
        businessId,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Trip vehicle not found",
        });
      }
    } else if (trip.fleetSource === "Vendor") {
      if (!trip.vendorVehicleId) {
        return res.status(400).json({
          success: false,
          message: "Vendor trip has no vendor vehicle assigned",
        });
      }

      vendorVehicle = await VendorVehicle.findOne({
        _id: trip.vendorVehicleId,
      });

      if (!vendorVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vendor vehicle not found",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet source",
      });
    }

    // =================================================
    // VALIDATE INSPECTION RESULT
    // =================================================

    const checks = [
      req.body.engineOil === true,
      req.body.coolant === true,
      req.body.brakes === true,
      validateTyres(req.body.tyres) === true,
      req.body.battery === true,
      req.body.lights === true,
      req.body.horn === true,
      req.body.windshield === true,
      req.body.documents === true,
      req.body.bodyDamage === false,
    ];

    const passed = checks.every(Boolean);

    // =================================================
    // CREATE POST-TRIP INSPECTION
    // =================================================

    const inspection = await PostTripInspection.create({
      businessId,
      tripId: trip._id,

      vehicleId: trip.fleetSource === "Own Fleet"
        ? trip.vehicleId
        : undefined,

      vendorVehicleId: trip.fleetSource === "Vendor"
        ? trip.vendorVehicleId
        : undefined,

      inspectedBy,

      odometer: req.body.odometer,
      fuelRemaining: req.body.fuelRemaining,

      engineOil: req.body.engineOil,
      coolant: req.body.coolant,
      brakes: req.body.brakes,
      battery: req.body.battery,
      lights: req.body.lights,
      horn: req.body.horn,
      windshield: req.body.windshield,
      documents: req.body.documents,
      bodyDamage: req.body.bodyDamage,

      remarks: req.body.remarks,
      photos: req.body.photos,
      tyres: req.body.tyres,

      inspectionStatus: passed ? "Passed" : "Failed",
    });

    // =================================================
    // UPDATE VEHICLE STATUS
    // =================================================

    const vehicleStatus = passed ? "Available" : "Maintenance";

    if (vehicle) {
      vehicle.status = vehicleStatus;
      vehicle.currentTripId = undefined;
      await vehicle.save();
    }

    if (vendorVehicle) {
      vendorVehicle.status = passed ? "Available" : "On Trip";
      vendorVehicle.currentTripId = undefined;
      await vendorVehicle.save();
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(201).json({
      success: true,
      message: passed
        ? "Post-trip inspection passed successfully"
        : "Post-trip inspection failed. Vehicle requires attention.",
      data: {
        inspection,
        trip: {
          _id: trip._id,
          tripNo: trip.tripNo,
          tripStatus: trip.tripStatus,
        },
        vehicleStatus,
        inspectionStatus: inspection.inspectionStatus,
      },
    });
  } catch (error) {
    console.error("postTripInspection error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Post-trip inspection already exists for this trip",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllPostInspection = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const inspections = await PostTripInspection.find({
      businessId,
    })
      .populate(
        "tripId",
        "tripNo journeyType tripStatus currentLeg journeyLegs"
      )
      .populate(
        "vehicleId",
        "regNo vehicleNo status"
      )
      .populate(
        "vendorVehicleId",
        "vehicleNumber status"
      )
      .populate(
        "inspectedBy",
        "name driverName mobile"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: inspections.length,
      data: inspections,
    });
  } catch (error) {
    console.error("getAllPostInspection error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPostInspectionById = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const inspection = await PostTripInspection.findOne({
      _id: req.params.id,
      businessId,
    })
      .populate("tripId")
      .populate("vehicleId")
      .populate("vendorVehicleId")
      .populate("inspectedBy");

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: "Post trip inspection not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    console.error("getPostInspectionById error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePostTripInspection = async (req, res) => {
  try {
    const businessId = req.driver.businessId;
    const { inspectionId } = req.params;

    // =================================================
    // FIND INSPECTION
    // =================================================

    const inspection = await PostTripInspection.findOne({
      _id: inspectionId,
      businessId,
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: "Post-trip inspection not found",
      });
    }

    // =================================================
    // FIND TRIP
    // =================================================

    const trip = await Trip.findOne({
      _id: inspection.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // =================================================
    // TRIP MUST BE COMPLETED
    // =================================================

    if (trip.tripStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "Post-trip inspection can only be updated for a completed trip",
      });
    }

    // =================================================
    // ALL JOURNEY LEGS MUST BE COMPLETED
    // =================================================

    const pendingLeg = trip.journeyLegs.find(
      (leg) => leg.legStatus !== "Completed"
    );

    if (pendingLeg) {
      return res.status(400).json({
        success: false,
        message: `Journey Leg ${pendingLeg.legNo} is not completed`,
      });
    }

    // =================================================
    // VALIDATE ASSOCIATED VEHICLE
    // =================================================

    let vehicle = null;
    let vendorVehicle = null;

    if (trip.fleetSource === "Own Fleet") {
      if (!trip.vehicleId) {
        return res.status(400).json({
          success: false,
          message: "Own Fleet trip has no vehicle assigned",
        });
      }

      vehicle = await Vehicle.findOne({
        _id: trip.vehicleId,
        businessId,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Trip vehicle not found",
        });
      }
    } else if (trip.fleetSource === "Vendor") {
      if (!trip.vendorVehicleId) {
        return res.status(400).json({
          success: false,
          message: "Vendor trip has no vendor vehicle assigned",
        });
      }

      vendorVehicle = await VendorVehicle.findOne({
        _id: trip.vendorVehicleId,
      });

      if (!vendorVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vendor vehicle not found",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet source",
      });
    }

    // =================================================
    // UPDATE ALLOWED FIELDS ONLY
    // =================================================

    const allowedFields = [
      "odometer",
      "fuelRemaining",
      "engineOil",
      "coolant",
      "brakes",
      "battery",
      "lights",
      "horn",
      "windshield",
      "documents",
      "bodyDamage",
      "remarks",
      "photos",
      "tyres",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        inspection[field] = req.body[field];
      }
    }

    // Do not allow changing tripId, businessId, vehicleId,
    // vendorVehicleId or inspectionStatus from the request.

    // =================================================
    // RE-CHECK INSPECTION
    // =================================================

    const checks = [
      inspection.engineOil === true,
      inspection.coolant === true,
      inspection.brakes === true,
      validateTyres(inspection.tyres) === true,
      inspection.battery === true,
      inspection.lights === true,
      inspection.horn === true,
      inspection.windshield === true,
      inspection.documents === true,
      inspection.bodyDamage === false,
    ];

    const passed = checks.every(Boolean);

    inspection.inspectionStatus = passed ? "Passed" : "Failed";

    await inspection.save();

    // =================================================
    // UPDATE VEHICLE STATUS
    // =================================================

    if (vehicle) {
      vehicle.status = passed ? "Available" : "Maintenance";
      vehicle.currentTripId = undefined;
      await vehicle.save();
    }

    if (vendorVehicle) {
      // Use only statuses supported by your VendorVehicle schema.
      vendorVehicle.status = passed ? "Available" : "On Trip";
      vendorVehicle.currentTripId = undefined;
      await vendorVehicle.save();
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message: passed
        ? "Post-trip inspection updated successfully"
        : "Post-trip inspection failed. Vehicle requires attention.",
      data: {
        inspection,
        vehicleStatus: passed
          ? "Available"
          : trip.fleetSource === "Own Fleet"
            ? "Maintenance"
            : "On Trip",
      },
    });
  } catch (error) {
    console.error("updatePostTripInspection error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};