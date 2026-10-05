const Vendor = require("../models/Vendor");
const Trip = require("../models/Trip");

exports.createVendor = async (req, res) => {
  try {
    const businessId =
      req.user.businessId;

    const existingVendor =
      await Vendor.findOne({
        businessId,
        mobile: req.body.mobile,
      });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message:
          "Vendor mobile already exists",
      });
    }

    const vendor =
      await Vendor.create({
        businessId,
        ...req.body,
      });

    res.status(201).json({
      success: true,
      message:
        "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors =
      await Vendor.find({
        businessId:
          req.user.businessId,
      }).sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendor = async (req, res) => {
  try {
    const vendor =
      await Vendor.findOne({
        _id: req.params.id,
        businessId:
          req.user.businessId,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const businessId =
      req.user.businessId;

    const vendor =
      await Vendor.findOne({
        _id: req.params.id,
        businessId,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (
      req.body.mobile &&
      req.body.mobile !== vendor.mobile
    ) {
      const duplicate =
        await Vendor.findOne({
          businessId,
          mobile: req.body.mobile,
          _id: { $ne: vendor._id },
        });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile already exists",
        });
      }
    }

    const updated =
      await Vendor.findByIdAndUpdate(
        vendor._id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    res.json({
      success: true,
      message:
        "Vendor updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor =
      await Vendor.findOne({
        _id: req.params.id,
        businessId:
          req.user.businessId,
      });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await Vendor.deleteOne({
      _id: vendor._id,
    });

    res.json({
      success: true,
      message:
        "Vendor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getVendorSettlement = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const businessId = req.user.businessId;

    // ============================================
    // VALIDATE VENDOR ID
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    // ============================================
    // FIND VENDOR
    // ============================================

    const vendor = await Vendor.findOne({
      _id: vendorId,
      businessId,
    }).lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // ============================================
    // FIND ALL COMPLETED VENDOR TRIPS
    // ============================================

    const trips = await Trip.find({
      businessId,
      status: "Completed",
      fleetSource: "Vendor",
      vendorId: vendor._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    // ============================================
    // EXISTING SETTLED AMOUNT
    // ============================================

    const settledAmount = Number(
      vendor.settlement?.settledAmount || 0
    );

    // ============================================
    // CALCULATE TOTAL PAYABLE
    // ============================================

    let totalPayable = 0;

    const settlementTrips = [];

    for (const trip of trips) {
      const vendorAmount = Number(
        trip.vendorAmount || 0
      );

      totalPayable += vendorAmount;

      settlementTrips.push({
        tripId: trip._id,

        tripNo: trip.tripNo || null,

        vehicleId: trip.vehicleId || null,

        vehicleNo: trip.vehicleNo || null,

        vehicleCategory:
          trip.vehicleCategory || null,

        vendorVehicleId:
          trip.vendorVehicleId || null,

        journeyType:
          trip.journeyType || null,

        vendorAmount,
      });
    }

    // ============================================
    // CALCULATE BALANCE
    // ============================================

    const balanceAmount = Math.max(
      totalPayable - settledAmount,
      0
    );

    // ============================================
    // CALCULATE STATUS
    // ============================================

    let status = "Pending";

    if (totalPayable <= 0) {
      status = "Settled";
    } else if (settledAmount >= totalPayable) {
      status = "Settled";
    } else if (settledAmount > 0) {
      status = "Partial";
    }

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,

      message:
        "Vendor settlement fetched successfully",

      data: {
        vendor: {
          _id: vendor._id,

          vendorCode:
            vendor.vendorCode,

          companyName:
            vendor.companyName,

          contactPerson:
            vendor.contactPerson || "",

          mobile:
            vendor.mobile,

          email:
            vendor.email || "",

          gstNo:
            vendor.gstNo || "",

          city:
            vendor.city || "",

          state:
            vendor.state || "",
        },

        settlement: {
          totalPayable,

          settledAmount,

          balanceAmount,

          status,

          lastSettledAt:
            vendor.settlement?.lastSettledAt ||
            null,

          remarks:
            vendor.settlement?.remarks ||
            "",
        },

        summary: {
          totalTrips:
            settlementTrips.length,

          totalVendorAmount:
            totalPayable,
        },

        trips:
          settlementTrips,
      },
    });
  } catch (error) {
    console.error(
      "getVendorSettlement error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch vendor settlement",

      error: error.message,
    });
  }
};

exports.settleVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const {
      amount,
      remarks,
    } = req.body;

    const businessId = req.user.businessId;

    // ============================================
    // VALIDATE VENDOR ID
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    // ============================================
    // VALIDATE AMOUNT
    // ============================================

    const settlementAmount = Number(amount);

    if (
      !Number.isFinite(settlementAmount) ||
      settlementAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Settlement amount must be greater than 0",
      });
    }

    // ============================================
    // FIND VENDOR
    // ============================================

    const vendor = await Vendor.findOne({
      _id: vendorId,
      businessId,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // ============================================
    // FIND ALL COMPLETED VENDOR TRIPS
    // ============================================

    const trips = await Trip.find({
      businessId,
      status: "Completed",
      fleetSource: "Vendor",
      vendorId: vendor._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    // ============================================
    // CALCULATE TOTAL PAYABLE
    // ============================================

    let totalPayable = 0;

    const settlementTrips = [];

    for (const trip of trips) {
      const vendorAmount = Number(
        trip.vendorAmount || 0
      );

      totalPayable += vendorAmount;

      settlementTrips.push({
        tripId: trip._id,

        tripNo: trip.tripNo || null,

        vehicleId: trip.vehicleId || null,

        vehicleNo: trip.vehicleNo || null,

        vehicleCategory:
          trip.vehicleCategory || null,

        vendorVehicleId:
          trip.vendorVehicleId || null,

        journeyType:
          trip.journeyType || null,

        vendorAmount,
      });
    }

    // ============================================
    // EXISTING SETTLEMENT
    // ============================================

    const previousSettledAmount = Number(
      vendor.settlement?.settledAmount || 0
    );

    // ============================================
    // CURRENT BALANCE
    // ============================================

    const currentBalance = Math.max(
      totalPayable -
        previousSettledAmount,
      0
    );

    // ============================================
    // PREVENT OVER SETTLEMENT
    // ============================================

    if (
      settlementAmount >
      currentBalance
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Settlement amount cannot be greater than vendor's outstanding balance",

        data: {
          totalPayable,

          alreadySettled:
            previousSettledAmount,

          currentBalance,

          requestedAmount:
            settlementAmount,
        },
      });
    }

    // ============================================
    // NEW SETTLED AMOUNT
    // ============================================

    const newSettledAmount =
      previousSettledAmount +
      settlementAmount;

    // ============================================
    // NEW BALANCE
    // ============================================

    const newBalanceAmount =
      Math.max(
        totalPayable -
          newSettledAmount,
        0
      );

    // ============================================
    // NEW STATUS
    // ============================================

    let newStatus = "Pending";

    if (totalPayable <= 0) {
      newStatus = "Settled";
    } else if (
      newSettledAmount >=
      totalPayable
    ) {
      newStatus = "Settled";
    } else if (
      newSettledAmount > 0
    ) {
      newStatus = "Partial";
    }

    // ============================================
    // UPDATE VENDOR SETTLEMENT
    // ============================================

    if (!vendor.settlement) {
      vendor.settlement = {};
    }

    vendor.settlement.totalPayable =
      totalPayable;

    vendor.settlement.settledAmount =
      newSettledAmount;

    vendor.settlement.balanceAmount =
      newBalanceAmount;

    vendor.settlement.status =
      newStatus;

    vendor.settlement.lastSettledAt =
      new Date();

    if (remarks !== undefined) {
      vendor.settlement.remarks =
        remarks;
    }

    // ============================================
    // SAVE CURRENT TRIP CALCULATION
    // ============================================

    vendor.settlement.trips =
      settlementTrips;

    vendor.markModified(
      "settlement"
    );

    await vendor.save();

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,

      message:
        "Vendor settlement completed successfully",

      data: {
        vendorId:
          vendor._id,

        vendorCode:
          vendor.vendorCode,

        totalPayable,

        previousSettledAmount,

        settledAmount:
          settlementAmount,

        totalSettledAmount:
          newSettledAmount,

        balanceAmount:
          newBalanceAmount,

        status:
          newStatus,

        lastSettledAt:
          vendor.settlement.lastSettledAt,

        remarks:
          vendor.settlement.remarks || "",

        summary: {
          totalTrips:
            settlementTrips.length,

          totalVendorAmount:
            totalPayable,
        },
      },
    });
  } catch (error) {
    console.error(
      "settleVendor error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to settle vendor",

      error: error.message,
    });
  }
};