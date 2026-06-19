const Tyre = require("../models/Tyre");
const Vehicle = require("../models/Vehicle");
const generateTyreCode = require("../utils/generateTyreCode");

exports.createTyre = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const existingTin = await Tyre.findOne({
      businessId,
      tin: req.body.tin,
    });

    if (existingTin) {
      return res.status(400).json({
        success: false,
        message: "TIN already exists",
      });
    }

    const tyreCode = await generateTyreCode();

    const tyre = await Tyre.create({
      businessId,

      tyreCode,

      tin: req.body.tin,

      brand: req.body.brand,

      model: req.body.model,

      size: req.body.size,

      purchaseCost: req.body.purchaseCost,

      purchaseDate: req.body.purchaseDate,
    });

    res.status(201).json({
      success: true,
      message: "Tyre added to inventory",
      data: tyre,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTyres = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const tyres = await Tyre.find({
      businessId,
    })
      .populate("vehicleId", "regNo make model")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: tyres.length,
      data: tyres,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTyreById = async (req, res) => {
  try {
    const tyre = await Tyre.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    }).populate("vehicleId", "regNo make model");

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    res.status(200).json({
      success: true,
      data: tyre,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateTyre = async (req, res) => {
  try {
    const tyre = await Tyre.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    Object.assign(tyre, req.body);

    // Recalculate Risk

    if (tyre.treadDepth <= 2) {
      tyre.riskLevel = "Critical";
    } else if (tyre.treadDepth <= 4) {
      tyre.riskLevel = "Warning";
    } else {
      tyre.riskLevel = "Healthy";
    }

    await tyre.save();

    res.status(200).json({
      success: true,
      message: "Tyre updated successfully",
      data: tyre,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteTyre = async (req, res) => {
  try {
    const tyre = await Tyre.findOneAndDelete({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tyre deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.assignTyre = async (
  req,
  res
) => {
  try {

    const tyre =
      await Tyre.findOne({
        _id: req.params.id,
        businessId:
          req.user.businessId
      });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found"
      });
    }

    if (
      tyre.status === "Installed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tyre already installed"
      });
    }

    tyre.vehicleId =
      req.body.vehicleId;

    tyre.position =
      req.body.position;

    tyre.installedDate =
      req.body.installedDate;

    tyre.currentKm =
      req.body.currentKm || 0;

    tyre.treadDepth =
      req.body.treadDepth || 16;

    tyre.status =
      "Installed";

    await tyre.save();

    res.json({
      success: true,
      message:
        "Tyre assigned successfully",
      data: tyre
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


exports.addInspection = async (req, res) => {
  try {

    const tyre = await Tyre.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    tyre.inspections.push({
      inspectionDate: new Date(),
      treadDepth: req.body.treadDepth,
      currentKm: req.body.currentKm,
      pressure: req.body.pressure,
      remarks: req.body.remarks,
    });

    // Update latest values on tyre master record
    tyre.treadDepth = req.body.treadDepth;
    tyre.currentKm = req.body.currentKm;

    await tyre.save();

    res.status(200).json({
      success: true,
      message: "Inspection added successfully",
      data: tyre,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


exports.predictTyreLife = async (req, res) => {
  try {

    const tyre = await Tyre.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!tyre) {
      return res.status(404).json({
        success: false,
        message: "Tyre not found",
      });
    }

    if (tyre.inspections.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum 2 inspections required",
      });
    }

    const latest =
      tyre.inspections[tyre.inspections.length - 1];

    const previous =
      tyre.inspections[tyre.inspections.length - 2];

    const treadLoss =
      previous.treadDepth -
      latest.treadDepth;

    const kmTravelled =
      latest.currentKm -
      previous.currentKm;

    if (
      treadLoss <= 0 ||
      kmTravelled <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid inspection data",
      });
    }

    const wearPerKm =
      treadLoss / kmTravelled;

    const remainingTread =
      latest.treadDepth - 2;

    const estimatedKmLeft =
      Math.round(
        remainingTread /
        wearPerKm
      );

    let riskLevel = "Healthy";

    if (latest.treadDepth <= 2.5) {
      riskLevel = "Critical";
    } else if (latest.treadDepth <= 4) {
      riskLevel = "Warning";
    }

    tyre.estimatedKmLeft =
      estimatedKmLeft;

    tyre.riskLevel =
      riskLevel;

    await tyre.save();

    res.status(200).json({
      success: true,
      data: {
        tyreCode: tyre.tyreCode,
        currentTread:
          latest.treadDepth,
        estimatedKmLeft,
        riskLevel,
      },
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


exports.replaceTyre = async (req, res) => {
  try {

    const oldTyre = await Tyre.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!oldTyre) {
      return res.status(404).json({
        success: false,
        message: "Old tyre not found",
      });
    }

    if (oldTyre.status !== "Installed") {
      return res.status(400).json({
        success: false,
        message:
          "Only installed tyres can be replaced",
      });
    }

    const newTyre = await Tyre.findOne({
      _id: req.body.newTyreId,
      businessId: req.user.businessId,
      status: "In Stock",
    });

    if (!newTyre) {
      return res.status(404).json({
        success: false,
        message: "New tyre not found",
      });
    }

    const vehicleId = oldTyre.vehicleId;
    const position = oldTyre.position;

    // Install new tyre
    newTyre.vehicleId = vehicleId;
    newTyre.position = position;
    newTyre.installedDate = new Date();
    newTyre.status = "Installed";

    await newTyre.save();

    // Mark old tyre replaced
    oldTyre.status = "Replaced";
    oldTyre.vehicleId = null;
    oldTyre.position = null;

    oldTyre.replacementHistory.push({
      oldTyreId: oldTyre._id,
      newTyreId: newTyre._id,
      reason: req.body.reason,
    });

    await oldTyre.save();

    res.status(200).json({
      success: true,
      message: "Tyre replaced successfully",
      data: {
        oldTyreCode: oldTyre.tyreCode,
        newTyreCode: newTyre.tyreCode,
        position,
      },
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};