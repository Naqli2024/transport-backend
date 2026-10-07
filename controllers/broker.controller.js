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

exports.getBrokerTripSummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { brokerId } = req.params;

    // --------------------------------------------------
    // 1. Find broker
    // IMPORTANT: settlement must be selected
    // --------------------------------------------------
    const broker = await Broker.findOne({
      _id: brokerId,
      businessId,
    }).select(
      "brokerId companyName contactPerson mobile email settlement"
    );

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // --------------------------------------------------
    // 2. Find completed trips containing this broker
    // --------------------------------------------------
    const trips = await Trip.find({
      businessId,
      tripStatus: "Completed",
      journeyLegs: {
        $elemMatch: {
          brokerId: brokerId,
          brokerAmount: {
            $gt: 0,
          },
        },
      },
    })
      .populate("vehicleId", "regNo")
      .sort({
        completedAt: -1,
        createdAt: -1,
      });

    // --------------------------------------------------
    // 3. Existing settlement records
    // --------------------------------------------------
    const settlementTrips =
      broker.settlement?.trips || [];

    const round = (value) =>
      Number(Number(value || 0).toFixed(2));

    let totalBrokerAmount = 0;
    let totalSettledAmount = 0;
    let totalBalanceAmount = 0;

    const tripData = [];

    // --------------------------------------------------
    // 4. Process each trip
    // --------------------------------------------------
    for (const trip of trips) {
      const brokerLegs = (
        trip.journeyLegs || []
      ).filter(
        (leg) =>
          leg.brokerId?.toString() ===
            brokerId.toString() &&
          Number(leg.brokerAmount || 0) > 0
      );

      if (brokerLegs.length === 0) {
        continue;
      }

      // ------------------------------------------------
      // Existing settlement for this trip
      // ------------------------------------------------
      const existingSettlement =
        settlementTrips.find(
          (item) =>
            item.tripId?.toString() ===
            trip._id.toString()
        );

      const legs = [];

      // ------------------------------------------------
      // Process each broker leg
      // ------------------------------------------------
      for (const leg of brokerLegs) {
        const brokerAmount = round(
          leg.brokerAmount || 0
        );

        // ----------------------------------------------
        // Existing settlement for this leg
        // ----------------------------------------------
        const existingLeg =
          existingSettlement?.legs?.find(
            (item) =>
              Number(item.legNo) ===
              Number(leg.legNo)
          );

        // ----------------------------------------------
        // Settled amount from broker settlement
        // ----------------------------------------------
        const settledAmount = round(
          existingLeg?.settledAmount || 0
        );

        // ----------------------------------------------
        // Calculate current balance
        // ----------------------------------------------
        const balanceAmount = round(
          Math.max(
            brokerAmount - settledAmount,
            0
          )
        );

        // ----------------------------------------------
        // Determine leg status
        // ----------------------------------------------
        let status = "Pending";

        if (
          settledAmount >=
          brokerAmount
        ) {
          status = "Settled";
        } else if (
          settledAmount > 0
        ) {
          status = "Partial";
        }

        // ----------------------------------------------
        // Add to overall summary
        // ----------------------------------------------
        totalBrokerAmount += brokerAmount;

        totalSettledAmount += settledAmount;

        totalBalanceAmount +=
          balanceAmount;

        // ----------------------------------------------
        // Add leg response
        // ----------------------------------------------
        legs.push({
          legNo: leg.legNo,

          from: leg.from || "",

          to: leg.to || "",

          brokerId: leg.brokerId,

          brokerAmount,

          settledAmount,

          balanceAmount,

          status,
        });
      }

      if (legs.length === 0) {
        continue;
      }

      // ------------------------------------------------
      // Trip totals
      // ------------------------------------------------
      const tripBrokerAmount = round(
        legs.reduce(
          (sum, leg) =>
            sum +
            Number(
              leg.brokerAmount || 0
            ),
          0
        )
      );

      const tripSettledAmount = round(
        legs.reduce(
          (sum, leg) =>
            sum +
            Number(
              leg.settledAmount || 0
            ),
          0
        )
      );

      const tripBalanceAmount = round(
        legs.reduce(
          (sum, leg) =>
            sum +
            Number(
              leg.balanceAmount || 0
            ),
          0
        )
      );

      // ------------------------------------------------
      // Trip status
      // ------------------------------------------------
      let tripStatus = "Pending";

      if (
        tripSettledAmount >=
        tripBrokerAmount
      ) {
        tripStatus = "Settled";
      } else if (
        tripSettledAmount > 0
      ) {
        tripStatus = "Partial";
      }

      // ------------------------------------------------
      // Trip response
      // ------------------------------------------------
      tripData.push({
        tripId: trip._id,

        tripNo: trip.tripNo,

        vehicleId:
          trip.vehicleId?._id || null,

        vehicleNo:
          trip.vehicleId?.regNo || "-",

        journeyType:
          trip.journeyType,

        legs,

        totalBrokerAmount:
          tripBrokerAmount,

        totalSettledAmount:
          tripSettledAmount,

        totalBalanceAmount:
          tripBalanceAmount,

        status: tripStatus,
      });
    }

    // --------------------------------------------------
    // 5. Final response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,

      data: {
        broker: {
          _id: broker._id,

          brokerId:
            broker.brokerId,

          companyName:
            broker.companyName,

          contactPerson:
            broker.contactPerson,

          mobile:
            broker.mobile,

          email:
            broker.email,
        },

        summary: {
          totalTrips:
            tripData.length,

          totalBrokerAmount:
            round(totalBrokerAmount),

          totalSettledAmount:
            round(totalSettledAmount),

          totalBalanceAmount:
            round(totalBalanceAmount),
        },

        trips: tripData,
      },
    });
  } catch (error) {
    console.error(
      "getBrokerTripSummary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.settleBrokerAmount = async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    const { brokerId } = req.params;

    const {
      settlements,
      remarks,
    } = req.body || {};

    // --------------------------------------------------
    // 1. Validate authentication
    // --------------------------------------------------

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message: "Business authentication details are missing",
      });
    }

    // --------------------------------------------------
    // 2. Validate request
    // --------------------------------------------------

    if (
      !Array.isArray(settlements) ||
      settlements.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "settlements must be a non-empty array",
      });
    }

    // --------------------------------------------------
    // 3. Find broker
    // --------------------------------------------------

    const broker = await Broker.findOne({
      _id: brokerId,
      businessId,
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const round = (value) =>
      Number(Number(value || 0).toFixed(2));

    const settledResults = [];

    // --------------------------------------------------
    // 4. Process each requested trip
    // --------------------------------------------------

    for (const requestItem of settlements) {
      const { tripId, legs } = requestItem;

      if (!tripId) {
        continue;
      }

      if (!Array.isArray(legs) || legs.length === 0) {
        continue;
      }

      // ------------------------------------------------
      // Find completed trip
      // ------------------------------------------------

      const trip = await Trip.findOne({
        _id: tripId,
        businessId,
        tripStatus: "Completed",
      }).populate(
        "vehicleId",
        "regNo",
      );

      if (!trip) {
        continue;
      }

      // ------------------------------------------------
      // Find only requested valid broker legs
      // ------------------------------------------------

      const validRequestedLegs = [];

      for (const requestLeg of legs) {
        const tripLeg = trip.journeyLegs?.find(
          (leg) =>
            Number(leg.legNo) ===
            Number(requestLeg.legNo),
        );

        if (!tripLeg) {
          continue;
        }

        // ----------------------------------------------
        // Make sure this leg belongs to this broker
        // ----------------------------------------------

        if (
          !tripLeg.brokerId ||
          tripLeg.brokerId.toString() !== brokerId.toString()
        ) {
          continue;
        }

        const brokerAmount = round(
          tripLeg.brokerAmount || 0,
        );

        if (brokerAmount <= 0) {
          continue;
        }

        let requestedAmount = round(
          requestLeg.settledAmount || 0,
        );

        if (requestedAmount <= 0) {
          continue;
        }

        validRequestedLegs.push({
          requestLeg,
          tripLeg,
          brokerAmount,
          requestedAmount,
        });
      }

      // ------------------------------------------------
      // If no valid legs, don't create empty settlement
      // ------------------------------------------------

      if (validRequestedLegs.length === 0) {
        continue;
      }

      // ------------------------------------------------
      // Initialize settlement
      // ------------------------------------------------

      if (!broker.settlement) {
        broker.settlement = {
          trips: [],
        };
      }

      if (!Array.isArray(broker.settlement.trips)) {
        broker.settlement.trips = [];
      }

      // ------------------------------------------------
      // Find existing settlement trip
      // ------------------------------------------------

      let settlementTrip =
        broker.settlement.trips.find(
          (item) =>
            item.tripId?.toString() ===
            trip._id.toString(),
        );

      // ------------------------------------------------
      // Create settlement trip
      // ------------------------------------------------

      if (!settlementTrip) {
        settlementTrip = {
          tripId: trip._id,

          tripNo: trip.tripNo,

          vehicleId:
            trip.vehicleId?._id || null,

          vehicleNo:
            trip.vehicleId?.regNo || "-",

          journeyType:
            trip.journeyType,

          legs: [],

          totalBrokerAmount: 0,

          totalSettledAmount: 0,

          totalBalanceAmount: 0,

          status: "Pending",

          settledAt: null,

          remarks: remarks || "",
        };

        broker.settlement.trips.push(
          settlementTrip,
        );
      }

      // ------------------------------------------------
      // Process valid legs
      // ------------------------------------------------

      for (const item of validRequestedLegs) {
        const {
          requestLeg,
          tripLeg,
          brokerAmount,
        } = item;

        let requestedAmount =
          item.requestedAmount;

        // ----------------------------------------------
        // Find existing settlement leg
        // ----------------------------------------------

        let settlementLeg =
          settlementTrip.legs.find(
            (item) =>
              Number(item.legNo) ===
              Number(tripLeg.legNo),
          );

        // ----------------------------------------------
        // Create settlement leg
        // ----------------------------------------------

        if (!settlementLeg) {
          settlementLeg = {
            legNo: Number(
              tripLeg.legNo,
            ),

            from:
              tripLeg.from || "",

            to:
              tripLeg.to || "",

            brokerAmount,

            settledAmount: 0,

            balanceAmount: brokerAmount,

            status: "Pending",
          };

          settlementTrip.legs.push(
            settlementLeg,
          );
        } else {
          // --------------------------------------------
          // Always use actual broker amount
          // from Trip
          // --------------------------------------------

          settlementLeg.brokerAmount =
            brokerAmount;
        }

        // ----------------------------------------------
        // Current settled amount
        // ----------------------------------------------

        const currentSettledAmount =
          round(
            settlementLeg.settledAmount || 0,
          );

        const currentBalance =
          round(
            brokerAmount -
              currentSettledAmount,
          );

        // ----------------------------------------------
        // Already completely settled
        // ----------------------------------------------

        if (currentBalance <= 0) {
          settlementLeg.balanceAmount = 0;
          settlementLeg.status = "Settled";

          continue;
        }

        // ----------------------------------------------
        // Prevent over settlement
        // ----------------------------------------------

        if (
          requestedAmount >
          currentBalance
        ) {
          requestedAmount =
            currentBalance;
        }

        // ----------------------------------------------
        // Update settlement leg
        // ----------------------------------------------

        settlementLeg.settledAmount =
          round(
            currentSettledAmount +
              requestedAmount,
          );

        settlementLeg.balanceAmount =
          round(
            brokerAmount -
              settlementLeg.settledAmount,
          );

        // ----------------------------------------------
        // Update leg status
        // ----------------------------------------------

        if (
          settlementLeg.balanceAmount <= 0
        ) {
          settlementLeg.balanceAmount = 0;

          settlementLeg.status =
            "Settled";
        } else if (
          settlementLeg.settledAmount > 0
        ) {
          settlementLeg.status =
            "Partial";
        } else {
          settlementLeg.status =
            "Pending";
        }
      }

      // ------------------------------------------------
      // Recalculate settlement trip totals
      // ------------------------------------------------

      settlementTrip.totalBrokerAmount =
        round(
          settlementTrip.legs.reduce(
            (sum, leg) =>
              sum +
              Number(
                leg.brokerAmount || 0,
              ),
            0,
          ),
        );

      settlementTrip.totalSettledAmount =
        round(
          settlementTrip.legs.reduce(
            (sum, leg) =>
              sum +
              Number(
                leg.settledAmount || 0,
              ),
            0,
          ),
        );

      settlementTrip.totalBalanceAmount =
        round(
          settlementTrip.legs.reduce(
            (sum, leg) =>
              sum +
              Number(
                leg.balanceAmount || 0,
              ),
            0,
          ),
        );

      // ------------------------------------------------
      // Update trip settlement status
      // ------------------------------------------------

      if (
        settlementTrip.totalSettledAmount >=
        settlementTrip.totalBrokerAmount
      ) {
        settlementTrip.status =
          "Settled";

        settlementTrip.settledAt =
          new Date();
      } else if (
        settlementTrip.totalSettledAmount > 0
      ) {
        settlementTrip.status =
          "Partial";

        settlementTrip.settledAt = null;
      } else {
        settlementTrip.status =
          "Pending";

        settlementTrip.settledAt = null;
      }

      settlementTrip.remarks =
        remarks || "";

      // ------------------------------------------------
      // Add response
      // ------------------------------------------------

      settledResults.push({
        tripId: trip._id,

        tripNo: trip.tripNo,

        status:
          settlementTrip.status,

        totalBrokerAmount:
          settlementTrip.totalBrokerAmount,

        totalSettledAmount:
          settlementTrip.totalSettledAmount,

        totalBalanceAmount:
          settlementTrip.totalBalanceAmount,

        legs:
          settlementTrip.legs,
      });
    }

    // --------------------------------------------------
    // 5. Make sure at least one settlement happened
    // --------------------------------------------------

    if (settledResults.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid broker settlement legs found for the requested trips",
      });
    }

    // --------------------------------------------------
    // 6. Recalculate broker outstanding amount
    // --------------------------------------------------

    const allSettlementTrips =
      broker.settlement?.trips || [];

    const outstandingAmount =
      allSettlementTrips.reduce(
        (sum, settlementTrip) =>
          sum +
          Number(
            settlementTrip.totalBalanceAmount || 0,
          ),
        0,
      );

    broker.outstandingAmount =
      round(outstandingAmount);

    await broker.save();

    // --------------------------------------------------
    // 7. Response
    // --------------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        "Broker settlement completed",

      data: {
        broker: {
          _id: broker._id,

          brokerId:
            broker.brokerId,

          companyName:
            broker.companyName,

          outstandingAmount:
            broker.outstandingAmount,
        },

        settlements:
          settledResults,
      },
    });
  } catch (error) {
    console.error(
      "settleBrokerAmount error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to settle broker amount",
    });
  }
};