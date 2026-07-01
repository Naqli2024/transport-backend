const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const PreTripInspection = require("../models/PreTripInspection");
const PostTripInspection = require("../models/PostTripInspection");

exports.createPreTripInspection = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { tripId, vehicleId, inspectedBy } = req.body;

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

    // Only pending trips can be inspected

    if (trip.tripStatus !== "Pre Trip Pending") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // Vehicle validation

    if (
      trip.fleetSource === "Own Fleet" &&
      trip.vehicleId?.toString() !== vehicleId
    ) {
      return res.status(400).json({
        success: false,
        message: "Inspection vehicle does not match trip vehicle",
      });
    }

    if (
      trip.fleetSource === "Vendor" &&
      trip.vendorVehicleId?.toString() !== vehicleId
    ) {
      return res.status(400).json({
        success: false,
        message: "Inspection vehicle does not match vendor vehicle",
      });
    }

    // Driver validation

    if (trip.driver1 && trip.driver1.toString() !== inspectedBy) {
      return res.status(400).json({
        success: false,
        message: "Only assigned driver can perform inspection",
      });
    }

    // Duplicate inspection

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

    const checks = [
      req.body.engineOil,
      req.body.coolant,
      req.body.brakes,
      req.body.tyres,
      req.body.lights,
      req.body.horn,
      req.body.fuel,
      req.body.documents,
      req.body.fireExtinguisher,
      req.body.firstAidKit,
    ];

    const passed = checks.every((item) => item === true);

    const inspection = await PreTripInspection.create({
      businessId,
      ...req.body,
      inspectionStatus: passed ? "Passed" : "Failed",
    });

    if (passed) {
      await Trip.findByIdAndUpdate(trip._id, {
        tripStatus: "Ready For Loading",
      });
    } else {
      await Trip.findByIdAndUpdate(trip._id, {
        tripStatus: "Pre Trip Pending",
      });
    }

    res.status(201).json({
      success: true,
      message: "Inspection submitted successfully",
      data: inspection,
    });
  } catch (error) {
    res.status(500).json({
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
    const businessId = req.user.businessId;
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
      inspection.tyres,
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
    const businessId = req.user.businessId;

    const { tripId, inspectedBy } = req.body;

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

    if (trip.tripStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "Trip is not completed yet",
      });
    }

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

    if (trip.driver1.toString() !== inspectedBy) {
      return res.status(400).json({
        success: false,
        message: "Only assigned driver can inspect",
      });
    }

    const checks = [
      req.body.engineOil,
      req.body.coolant,
      req.body.brakes,
      req.body.tyres,
      req.body.battery,
      req.body.lights,
      req.body.horn,
      req.body.windshield,
      req.body.documents,
      !req.body.bodyDamage,
    ];

    const passed = checks.every((item) => item === true);

    const inspection = await PostTripInspection.create({
      businessId,
      ...req.body,
      inspectionStatus: passed ? "Passed" : "Failed",
    });

    if (trip.fleetSource === "Own Fleet") {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        status: passed ? "Available" : "Maintenance",
      });
    }

    if (trip.fleetSource === "Vendor") {
      await VendorVehicle.findByIdAndUpdate(trip.vendorVehicleId, {
        status: passed ? "Available" : "Maintenance",
      });
    }

    res.status(201).json({
      success: true,
      message: "Post trip inspection completed",
      data: inspection,
    });
  } catch (error) {
    res.status(500).json({
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
      .populate("tripId", "tripNo journeyType tripStatus")
      .populate("vehicleId", "vehicleNo")
      .populate("vendorVehicleId", "vehicleNumber")
      .populate("inspectedBy", "driverName mobile")
      .sort({ createdAt: -1 });

    res.status(200).json({
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

    res.status(200).json({
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
