const Broker = require("../models/Broker");
const Trip = require("../models/Trip");

/* =================================
   CREATE BROKER
================================= */

exports.createBroker = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { companyName, mobile, email, gstNo } = req.body;

    // ============================
    // COMPANY NAME
    // ============================

    const existingCompany = await Broker.findOne({
      businessId,
      companyName,
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: "Broker company already exists",
      });
    }

    // ============================
    // MOBILE
    // ============================

    const existingMobile = await Broker.findOne({
      businessId,
      mobile,
    });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    // ============================
    // EMAIL
    // ============================

    if (email) {
      const existingEmail = await Broker.findOne({
        businessId,
        email,
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // ============================
    // GST
    // ============================

    if (gstNo) {
      const existingGST = await Broker.findOne({
        businessId,
        gstNo,
      });

      if (existingGST) {
        return res.status(400).json({
          success: false,
          message: "GST number already exists",
        });
      }
    }

    // ============================
    // CREATE BROKER
    // ============================

    const broker = await Broker.create({
      businessId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Broker created successfully",
      data: broker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   GET ALL BROKERS
================================= */

exports.getAllBrokers = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const brokers = await Broker.find({
      businessId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: brokers.length,
      data: brokers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   GET SINGLE BROKER
================================= */

exports.getBrokerById = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const broker = await Broker.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    res.status(200).json({
      success: true,
      data: broker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateBroker = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const broker = await Broker.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // ======================================
    // ACTIVE TRIPS USING THIS BROKER
    // ======================================

    const activeTrip = await Trip.findOne({
      businessId,
      brokerId: broker._id,
      tripStatus: {
        $in: [
          "Pre Trip Pending",
          "Ready To Start",
          "In Transit",
          "Post Trip Pending",
        ],
      },
    });

    // Cannot make inactive while active trip exists
    if (req.body.status === "Inactive" && activeTrip) {
      return res.status(400).json({
        success: false,
        message: "Broker has ongoing trips. Cannot mark as inactive.",
      });
    }

    // ======================================
    // COMPANY NAME
    // ======================================

    if (req.body.companyName) {
      const exists = await Broker.findOne({
        businessId,
        companyName: req.body.companyName,
        _id: { $ne: broker._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Company already exists",
        });
      }
    }

    // ======================================
    // MOBILE
    // ======================================

    if (req.body.mobile) {
      const exists = await Broker.findOne({
        businessId,
        mobile: req.body.mobile,
        _id: { $ne: broker._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Mobile already exists",
        });
      }
    }

    // ======================================
    // EMAIL
    // ======================================

    if (req.body.email) {
      const exists = await Broker.findOne({
        businessId,
        email: req.body.email,
        _id: { $ne: broker._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // ======================================
    // GST
    // ======================================

    if (req.body.gstNo) {
      const exists = await Broker.findOne({
        businessId,
        gstNo: req.body.gstNo,
        _id: { $ne: broker._id },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "GST already exists",
        });
      }
    }

    const updatedBroker = await Broker.findByIdAndUpdate(broker._id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Broker updated successfully",
      data: updatedBroker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteBroker = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const broker = await Broker.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // ======================================
    // ACTIVE TRIPS
    // ======================================

    const activeTrip = await Trip.findOne({
      businessId,
      brokerId: broker._id,
      tripStatus: {
        $in: [
          "Pre Trip Pending",
          "Ready To Start",
          "In Transit",
          "Post Trip Pending",
        ],
      },
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: "Broker has ongoing trips. Cannot delete.",
      });
    }

    // ======================================
    // OPTIONAL:
    // KEEP HISTORY
    // ======================================

    const history = await Trip.countDocuments({
      businessId,
      brokerId: broker._id,
    });

    if (history > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Broker has trip history. Mark as Inactive instead of deleting.",
      });
    }

    await Broker.deleteOne({
      _id: broker._id,
    });

    res.status(200).json({
      success: true,
      message: "Broker deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBrokerDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    // =====================================
    // SUMMARY
    // =====================================

    const totalBrokers = await Broker.countDocuments({
      businessId,
    });

    const activeBrokers = await Broker.countDocuments({
      businessId,
      status: "Active",
    });

    const inactiveBrokers = await Broker.countDocuments({
      businessId,
      status: "Inactive",
    });

    // =====================================
    // BROKER LIST
    // =====================================

    const brokers = await Broker.find({
      businessId,
    }).sort({
      companyName: 1,
    });

    let totalTrips = 0;
    let totalCommission = 0;
    let outstandingCommission = 0;

    const dashboard = [];

    for (const broker of brokers) {
      const trips = await Trip.find({
        businessId,
        brokerId: broker._id,
      });

      const tripCount = trips.length;

      const commission = trips.reduce(
        (sum, trip) => sum + (trip.commissionAmount || 0),
        0,
      );

      // Pending commission = trips not completed
      const outstanding = trips
        .filter((trip) => trip.tripStatus !== "Completed")
        .reduce((sum, trip) => sum + (trip.commissionAmount || 0), 0);

      const activeTrips = trips.filter((trip) =>
        [
          "Pre Trip Pending",
          "Ready To Start",
          "In Transit",
          "Post Trip Pending",
        ].includes(trip.tripStatus),
      );

      totalTrips += tripCount;
      totalCommission += commission;
      outstandingCommission += outstanding;

      dashboard.push({
        _id: broker._id,
        brokerId: broker.brokerId,
        companyName: broker.companyName,
        contactPerson: broker.contactPerson,
        mobile: broker.mobile,
        status: broker.status,

        totalTrips: tripCount,
        totalCommission: commission,
        outstandingCommission: outstanding,

        activeTrips: activeTrips.length,

        currentTrips: activeTrips.map((trip) => ({
          tripId: trip._id,
          tripNo: trip.tripNo,
          tripStatus: trip.tripStatus,
          customerId: trip.customerId,
          freightAmount: trip.freightAmount,
          commissionAmount: trip.commissionAmount,
        })),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBrokers,
          activeBrokers,
          inactiveBrokers,
          totalTrips,
          totalCommission,
          outstandingCommission,
        },
        brokers: dashboard,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
