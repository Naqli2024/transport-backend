const FuelEntry = require("../models/FuelEntry");
const Trip = require("../models/Trip");

exports.createFuelEntry = async (req, res) => {
  try {
    const businessId = req.user.businessId;
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
      billImage,
      remarks,
    } = req.body;

    // ============================
    // CHECK TRIP
    // ============================

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

    // ============================
    // TRIP STATUS
    // ============================

    if (trip.tripStatus !== "In Transit") {
      return res.status(400).json({
        success: false,
        message: `Trip currently ${trip.tripStatus}`,
      });
    }

    // ============================
    // CURRENT LEG
    // ============================

    const currentLeg = trip.journeyLegs.find(
      (leg) => leg.legNo === trip.currentLeg,
    );

    if (!currentLeg) {
      return res.status(400).json({
        success: false,
        message: "Current journey leg not found",
      });
    }

    if (currentLeg.status !== "In Progress") {
      return res.status(400).json({
        success: false,
        message: "Current leg is not active",
      });
    }

    // ============================
    // VALIDATION
    // ============================

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fuel quantity must be greater than zero",
      });
    }

    if (!rate || rate <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fuel rate must be greater than zero",
      });
    }

    if (!odometer || odometer <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid odometer reading is required",
      });
    }

    // ============================
    // CALCULATE AMOUNT
    // ============================

    const amount = Number(quantity) * Number(rate);

    // ============================
    // CREATE ENTRY
    // ============================

    const fuelEntry = await FuelEntry.create({
      businessId,

      tripId: trip._id,

      legNo: trip.currentLeg,

      driverId: trip.driver1,

      odometer,

      fuelStation,

      location,

      fuelType,

      quantity,

      rate,

      amount,

      paymentMode,

      billNo,

      billImage,

      remarks,
    });

    // ============================
    // UPDATE TRIP TOTAL
    // ============================

    trip.totalFuelCost = (trip.totalFuelCost || 0) + fuelEntry.amount;

    await trip.save();

    res.status(201).json({
      success: true,
      message: "Fuel entry added successfully",
      data: fuelEntry,
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

    const filter = {
      businessId,
      tripId,
    };

    if (req.query.legNo) {
      filter.legNo = Number(req.query.legNo);
    }

    const fuels = await FuelEntry.find(filter)
      .populate("driverId", "name driverId")
      .sort({ createdAt: -1 });

    const totalFuel = fuels.reduce((sum, item) => sum + item.quantity, 0);

    const totalAmount = fuels.reduce((sum, item) => sum + item.amount, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalEntries: fuels.length,
        totalFuel,
        totalAmount,
      },
      data: fuels,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateFuelEntry = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { fuelId } = req.params;

    const fuelEntry = await FuelEntry.findOne({
      _id: fuelId,
      businessId,
    });

    if (!fuelEntry) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    // ==========================
    // CHECK TRIP
    // ==========================

    const trip = await Trip.findOne({
      _id: fuelEntry.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.tripStatus === "Completed" || trip.tripStatus === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Fuel entry cannot be updated after trip completion",
      });
    }

    // ==========================
    // OLD AMOUNT
    // ==========================

    const oldAmount = fuelEntry.amount;

    // ==========================
    // UPDATE FIELDS
    // ==========================

    if (req.body.odometer) fuelEntry.odometer = req.body.odometer;

    if (req.body.fuelStation) fuelEntry.fuelStation = req.body.fuelStation;

    if (req.body.location) fuelEntry.location = req.body.location;

    if (req.body.fuelType) fuelEntry.fuelType = req.body.fuelType;

    if (req.body.quantity) fuelEntry.quantity = req.body.quantity;

    if (req.body.rate) fuelEntry.rate = req.body.rate;

    if (req.body.paymentMode) fuelEntry.paymentMode = req.body.paymentMode;

    if (req.body.billNo) fuelEntry.billNo = req.body.billNo;

    if (req.body.billImage !== undefined)
      fuelEntry.billImage = req.body.billImage;

    if (req.body.remarks) fuelEntry.remarks = req.body.remarks;

    // ==========================
    // RECALCULATE
    // ==========================

    fuelEntry.amount = Number(fuelEntry.quantity) * Number(fuelEntry.rate);

    await fuelEntry.save();

    // ==========================
    // UPDATE TRIP TOTAL
    // ==========================

    trip.totalFuelCost =
      (trip.totalFuelCost || 0) - oldAmount + fuelEntry.amount;

    await trip.save();

    res.status(200).json({
      success: true,
      message: "Fuel entry updated successfully",
      data: fuelEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteFuelEntry = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { fuelId } = req.params;

    // =========================
    // CHECK FUEL ENTRY
    // =========================

    const fuelEntry = await FuelEntry.findOne({
      _id: fuelId,
      businessId,
    });

    if (!fuelEntry) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    // =========================
    // CHECK TRIP
    // =========================

    const trip = await Trip.findOne({
      _id: fuelEntry.tripId,
      businessId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // =========================
    // TRIP STATUS
    // =========================

    if (trip.tripStatus === "Completed" || trip.tripStatus === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Fuel entry cannot be deleted after trip completion",
      });
    }

    // =========================
    // UPDATE TOTAL FUEL COST
    // =========================

    trip.totalFuelCost = Math.max(
      0,
      (trip.totalFuelCost || 0) - fuelEntry.amount,
    );

    await trip.save();

    // =========================
    // DELETE ENTRY
    // =========================

    await FuelEntry.deleteOne({
      _id: fuelEntry._id,
    });

    res.status(200).json({
      success: true,
      message: "Fuel entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTripFuelSummary = async (req, res) => {
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

    const fuelEntries = await FuelEntry.find({
      businessId,
      tripId,
    }).sort({ legNo: 1 });

    const totalEntries = fuelEntries.length;

    const totalFuel = fuelEntries.reduce((sum, item) => sum + item.quantity, 0);

    const totalAmount = fuelEntries.reduce((sum, item) => sum + item.amount, 0);

    const legs = [];

    for (const leg of trip.journeyLegs) {
      const legFuel = fuelEntries.filter((item) => item.legNo === leg.legNo);

      legs.push({
        legNo: leg.legNo,
        from: leg.from,
        to: leg.to,
        totalEntries: legFuel.length,
        totalFuel: legFuel.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: legFuel.reduce((sum, item) => sum + item.amount, 0),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tripNo: trip.tripNo,
        totalEntries,
        totalFuel,
        totalAmount,
        legs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFuelDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const fuelEntries = await FuelEntry.find({
      businessId,
    })
      .populate("driverId", "name driverId")
      .sort({ createdAt: -1 });

    const today = new Date();

    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const totalEntries = fuelEntries.length;

    const totalLitres = fuelEntries.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const totalFuelCost = fuelEntries.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const todayFuelCost = fuelEntries
      .filter((item) => item.createdAt >= startToday)
      .reduce((sum, item) => sum + item.amount, 0);

    const monthFuelCost = fuelEntries
      .filter((item) => item.createdAt >= startMonth)
      .reduce((sum, item) => sum + item.amount, 0);

    const averageRate =
      totalEntries > 0
        ? (
            fuelEntries.reduce((sum, item) => sum + item.rate, 0) / totalEntries
          ).toFixed(2)
        : 0;

    const recentEntries = fuelEntries.slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEntries,
          totalLitres,
          totalFuelCost,
          todayFuelCost,
          monthFuelCost,
          averageRate,
        },
        recentEntries,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
