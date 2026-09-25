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

    const {
      tripId,
      vehicleId,
      inspectedBy,
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
        message:
          `Leg ${currentLeg.legNo} currently ${currentLeg.legStatus}`,
      });
    }

    // =========================================================
    // VEHICLE VALIDATION
    // =========================================================

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "vehicleId is required for inspection",
      });
    }

    // Own Fleet
    if (
      trip.fleetSource === "Own Fleet" &&
      trip.vehicleId?.toString() !== vehicleId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Inspection vehicle does not match trip vehicle",
      });
    }

    // Vendor
    if (
      trip.fleetSource === "Vendor" &&
      trip.vendorVehicleId?.toString() !== vehicleId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Inspection vehicle does not match vendor vehicle",
      });
    }

    // =========================================================
    // DRIVER VALIDATION
    // =========================================================

    // Since driver1 is now inside journeyLegs,
    // use currentLeg.driver1 if you want to restrict
    // inspection to the assigned driver.

    // if (
    //   inspectedBy &&
    //   currentLeg.driver1 &&
    //   currentLeg.driver1.toString() !== inspectedBy.toString()
    // ) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Only assigned driver can perform inspection",
    //   });
    // }

    // =========================================================
    // DUPLICATE INSPECTION
    // =========================================================

    const existingInspection = await PreTripInspection.findOne({
      tripId,
      businessId,
    });

    if (existingInspection) {
      return res.status(400).json({
        success: false,
        message: "Pre-trip inspection already completed",
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

    const passed = checks.every(
      (item) => item === true
    );

    // =========================================================
    // CREATE INSPECTION
    // =========================================================

    const inspection = await PreTripInspection.create({
      businessId,
      ...req.body,
      inspectionStatus: passed
        ? "Passed"
        : "Failed",
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
        ? `Pre-trip inspection passed for Leg ${currentLeg.legNo}. Trip is ready for loading.`
        : `Pre-trip inspection failed for Leg ${currentLeg.legNo}. Trip remains pending.`,
      data: {
        inspection,
        trip: {
          _id: trip._id,
          tripNo: trip.tripNo,
          tripStatus: trip.tripStatus,
          currentLeg: trip.currentLeg,
          currentLegStatus: currentLeg.legStatus,
        },
      },
    });
  } catch (error) {
    console.error(
      "createPreTripInspection error:",
      error
    );

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

    // Update only the fields sent
    Object.assign(inspection, req.body);

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

    trip.tripStatus = passed
      ? "Ready For Loading"
      : "Pre Trip Pending";

    await trip.save();

    res.status(200).json({
      success: true,
      message: "Pre-trip inspection updated successfully",
      data: inspection,
    });

  } catch (error) {
    res.status(500).json({
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
        message: "Trip is not completed yet",
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
    // CHECK DUPLICATE INSPECTION
    // -------------------------------------------------
    const existing = await PostTripInspection.findOne({
      businessId,
      tripId,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Post trip inspection already completed",
      });
    }

    // -------------------------------------------------
    // GET FINAL JOURNEY LEG
    // -------------------------------------------------
    const finalLeg =
      trip.journeyLegs[trip.journeyLegs.length - 1];

    if (!finalLeg) {
      return res.status(400).json({
        success: false,
        message: "No journey leg found",
      });
    }

    // -------------------------------------------------
    // VALIDATE INSPECTING DRIVER
    // -------------------------------------------------
    const assignedFinalLegDrivers = [];

    if (finalLeg.driver1) {
      assignedFinalLegDrivers.push(
        finalLeg.driver1.toString()
      );
    }

    if (finalLeg.driver2) {
      assignedFinalLegDrivers.push(
        finalLeg.driver2.toString()
      );
    }

    // if (
    //   !inspectedBy ||
    //   !assignedFinalLegDrivers.includes(inspectedBy.toString())
    // ) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "Only a driver assigned to the final journey leg can perform post trip inspection",
    //   });
    // }

    // -------------------------------------------------
    // INSPECTION CHECKS
    // -------------------------------------------------
    const checks = [
      req.body.engineOil,
      req.body.coolant,
      req.body.brakes,
      validateTyres(req.body.tyres),
      req.body.battery,
      req.body.lights,
      req.body.horn,
      req.body.windshield,
      req.body.documents,
      !req.body.bodyDamage,
    ];

    const passed = checks.every(
      (item) => item === true
    );

    // -------------------------------------------------
    // CREATE INSPECTION
    // -------------------------------------------------
    const inspection = await PostTripInspection.create({
      businessId,
      tripId: trip._id,
      vehicleId: trip.vehicleId,
      vendorVehicleId: trip.vendorVehicleId,
      inspectedBy,
      engineOil: req.body.engineOil,
      coolant: req.body.coolant,
      brakes: req.body.brakes,
      tyres: req.body.tyres,
      battery: req.body.battery,
      lights: req.body.lights,
      horn: req.body.horn,
      windshield: req.body.windshield,
      documents: req.body.documents,
      bodyDamage: req.body.bodyDamage,
      inspectionStatus: passed ? "Passed" : "Failed",
      remarks: req.body.remarks,
    });

    // =================================================
    // UPDATE VEHICLE STATUS
    // =================================================

    if (trip.fleetSource === "Own Fleet") {
      if (!trip.vehicleId) {
        return res.status(400).json({
          success: false,
          message: "Own Fleet trip has no vehicle assigned",
        });
      }

      await Vehicle.findOneAndUpdate(
        {
          _id: trip.vehicleId,
          businessId,
        },
        {
          $set: {
            status: passed ? "Available" : "Maintenance",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // =================================================
    // UPDATE VENDOR VEHICLE STATUS
    // =================================================

    if (trip.fleetSource === "Vendor") {
      if (!trip.vendorVehicleId) {
        return res.status(400).json({
          success: false,
          message:
            "Vendor trip has no vendor vehicle assigned",
        });
      }

      await VendorVehicle.findOneAndUpdate(
        {
          _id: trip.vendorVehicleId,
        },
        {
          $set: {
            status: passed ? "Available" : "Maintenance",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------
    return res.status(201).json({
      success: true,
      message: passed
        ? "Post trip inspection completed successfully"
        : "Post trip inspection completed with failed checks",
      data: inspection,
    });
  } catch (error) {
    console.error("postTripInspection error:", error);

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

    // -------------------------------------------------
    // FIND INSPECTION
    // -------------------------------------------------
    const inspection = await PostTripInspection.findOne({
      _id: inspectionId,
      businessId,
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: "Post trip inspection not found",
      });
    }

    // -------------------------------------------------
    // FIND TRIP
    // -------------------------------------------------
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

    // -------------------------------------------------
    // TRIP MUST BE COMPLETED
    // -------------------------------------------------
    if (trip.tripStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "Trip is not completed yet",
      });
    }

    // -------------------------------------------------
    // ALL LEGS MUST BE COMPLETED
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
    // GET FINAL LEG
    // -------------------------------------------------
    const finalLeg =
      trip.journeyLegs[trip.journeyLegs.length - 1];

    if (!finalLeg) {
      return res.status(400).json({
        success: false,
        message: "No journey leg found",
      });
    }

    // -------------------------------------------------
    // VALIDATE INSPECTING DRIVER IF CHANGED
    // -------------------------------------------------
    // if (req.body.inspectedBy) {
    //   const assignedFinalLegDrivers = [];

    //   if (finalLeg.driver1) {
    //     assignedFinalLegDrivers.push(
    //       finalLeg.driver1.toString()
    //     );
    //   }

    //   if (finalLeg.driver2) {
    //     assignedFinalLegDrivers.push(
    //       finalLeg.driver2.toString()
    //     );
    //   }

    //   if (
    //     !assignedFinalLegDrivers.includes(
    //       req.body.inspectedBy.toString()
    //     )
    //   ) {
    //     return res.status(400).json({
    //       success: false,
    //       message:
    //         "Only a driver assigned to the final journey leg can perform post trip inspection",
    //     });
    //   }
    // }

    // -------------------------------------------------
    // UPDATE ALLOWED INSPECTION FIELDS
    // -------------------------------------------------

    const allowedFields = [
      "engineOil",
      "coolant",
      "brakes",
      "tyres",
      "battery",
      "lights",
      "horn",
      "windshield",
      "documents",
      "bodyDamage",
      "remarks",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        inspection[field] = req.body[field];
      }
    }

    // Allow inspectedBy only after validation
    if (req.body.inspectedBy !== undefined) {
      inspection.inspectedBy = req.body.inspectedBy;
    }

    // -------------------------------------------------
    // RE-CHECK INSPECTION
    // -------------------------------------------------

    const checks = [
      inspection.engineOil,
      inspection.coolant,
      inspection.brakes,
      validateTyres(inspection.tyres),
      inspection.battery,
      inspection.lights,
      inspection.horn,
      inspection.windshield,
      inspection.documents,
      !inspection.bodyDamage,
    ];

    const passed = checks.every(
      (item) => item === true
    );

    inspection.inspectionStatus = passed
      ? "Passed"
      : "Failed";

    await inspection.save();

    // =================================================
    // UPDATE VEHICLE STATUS
    // =================================================

    if (trip.fleetSource === "Own Fleet") {
      await Vehicle.findOneAndUpdate(
        {
          _id: trip.vehicleId,
          businessId,
        },
        {
          $set: {
            status: passed ? "Available" : "Maintenance",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // =================================================
    // UPDATE VENDOR VEHICLE STATUS
    // =================================================

    if (trip.fleetSource === "Vendor") {
      await VendorVehicle.findOneAndUpdate(
        {
          _id: trip.vendorVehicleId,
        },
        {
          $set: {
            status: passed ? "Available" : "Maintenance",
          },
          $unset: {
            currentTripId: 1,
          },
        }
      );
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      success: true,
      message: passed
        ? "Post-trip inspection updated successfully"
        : "Post-trip inspection updated with failed checks",
      data: inspection,
    });
  } catch (error) {
    console.error(
      "updatePostTripInspection error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};