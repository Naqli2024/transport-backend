const Customer = require("../models/Customer");
const Trip = require("../models/Trip");

/* =================================
   CREATE CUSTOMER
================================= */

exports.createCustomer = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const {
      companyName,
      mobile,
      email,
      gstNo,
    } = req.body;

    // ===========================
    // Company Name Duplicate
    // ===========================

    const existingCompany = await Customer.findOne({
      businessId,
      companyName: companyName.trim(),
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: "Customer company already exists",
      });
    }

    // ===========================
    // Mobile Duplicate
    // ===========================

    if (mobile) {
      const existingMobile = await Customer.findOne({
        businessId,
        mobile,
      });

      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    // ===========================
    // Email Duplicate
    // ===========================

    if (email) {
      const existingEmail = await Customer.findOne({
        businessId,
        email: email.toLowerCase(),
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // ===========================
    // GST Duplicate
    // ===========================

    if (gstNo) {
      const existingGST = await Customer.findOne({
        businessId,
        gstNo: gstNo.toUpperCase(),
      });

      if (existingGST) {
        return res.status(400).json({
          success: false,
          message: "GST number already exists",
        });
      }
    }

    // ===========================
    // Create Customer
    // ===========================

    const customer = await Customer.create({
      businessId,
      ...req.body,
      companyName: companyName.trim(),
      email: email ? email.toLowerCase() : undefined,
      gstNo: gstNo ? gstNo.toUpperCase() : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =================================
   GET ALL CUSTOMERS
================================= */

exports.getCustomers = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const customers = await Customer.find({
      businessId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =================================
   GET CUSTOMER BY ID
================================= */

exports.getCustomer = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const customer = await Customer.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =================================
   DELETE CUSTOMER
================================= */

exports.deleteCustomer = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const customer = await Customer.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check existing trips

    const tripExists = await Trip.exists({
      businessId,
      customerId: customer._id,
    });

    if (tripExists) {
      return res.status(400).json({
        success: false,
        message: "Customer is used in trips and cannot be deleted",
      });
    }

    await Customer.deleteOne({
      _id: customer._id,
    });

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.updateCustomer = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const customer = await Customer.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // =====================================
    // SYSTEM FIELDS CANNOT BE UPDATED
    // =====================================

    delete req.body.customerId;
    delete req.body.businessId;
    delete req.body.totalTrips;
    delete req.body.totalRevenue;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    // =====================================
    // ACTIVE TRIP CHECK
    // =====================================

    const activeTrip = await Trip.findOne({
      businessId,
      customerId: customer._id,
      tripStatus: {
        $in: [
          "Pre Trip Pending",
          "Ready To Start",
          "In Transit",
        ],
      },
    });

    if (activeTrip) {
      if (
        req.body.companyName ||
        req.body.status
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer has active trips. Company name and status cannot be modified.",
        });
      }
    }

    // ============================
    // COMPANY NAME
    // ============================

    if (req.body.companyName) {
      const existingCompany = await Customer.findOne({
        businessId,
        companyName: req.body.companyName,
        _id: { $ne: customer._id },
      });

      if (existingCompany) {
        return res.status(400).json({
          success: false,
          message: "Company already exists",
        });
      }
    }

    // ============================
    // MOBILE
    // ============================

    if (req.body.mobile) {
      const existingMobile = await Customer.findOne({
        businessId,
        mobile: req.body.mobile,
        _id: { $ne: customer._id },
      });

      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    // ============================
    // EMAIL
    // ============================

    if (req.body.email) {
      const existingEmail = await Customer.findOne({
        businessId,
        email: req.body.email,
        _id: { $ne: customer._id },
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

    if (req.body.gstNo) {
      const existingGST = await Customer.findOne({
        businessId,
        gstNo: req.body.gstNo,
        _id: { $ne: customer._id },
      });

      if (existingGST) {
        return res.status(400).json({
          success: false,
          message: "GST number already exists",
        });
      }
    }

    // =====================================
    // UPDATE
    // =====================================

    const updatedCustomer = await Customer.findOneAndUpdate(
      {
        _id: customer._id,
        businessId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getCustomerDashboard = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    // ============================================
    // VALIDATE AUTH
    // ============================================

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message: "Business authentication details are missing",
      });
    }

    // ============================================
    // SUMMARY
    // ============================================

    const totalCustomers = await Customer.countDocuments({
      businessId,
    });

    const activeCustomers = await Customer.countDocuments({
      businessId,
      status: "Active",
    });

    const inactiveCustomers = await Customer.countDocuments({
      businessId,
      status: "Inactive",
    });

    // ============================================
    // CUSTOMER LIST
    // ============================================

    const customers = await Customer.find({
      businessId,
    })
      .sort({
        companyName: 1,
      })
      .lean();

    // ============================================
    // GET ALL BUSINESS TRIPS
    //
    // Customer is stored inside journeyLegs.
    // ============================================

    const trips = await Trip.find({
      businessId,
    })
      .sort({
        createdAt: 1,
      })
      .lean();

    // ============================================
    // GLOBAL TOTALS
    // ============================================

    let totalTrips = 0;
    let totalRevenue = 0;
    let outstandingAmount = 0;

    const dashboard = [];

    // ============================================
    // PROCESS EACH CUSTOMER
    // ============================================

    for (const customer of customers) {
      const customerTrips = [];

      let customerRevenue = 0;

      // ==========================================
      // FIND CUSTOMER'S TRIPS
      // ==========================================

      for (const trip of trips) {
        const journeyLegs = Array.isArray(
          trip.journeyLegs,
        )
          ? trip.journeyLegs
          : [];

        // ----------------------------------------
        // FIND LEGS BELONGING TO THIS CUSTOMER
        // ----------------------------------------

        const customerLegs = journeyLegs.filter(
          (leg) =>
            leg.customerId &&
            leg.customerId.toString() ===
              customer._id.toString(),
        );

        if (!customerLegs.length) {
          continue;
        }

        // ----------------------------------------
        // CALCULATE CUSTOMER REVENUE FOR THIS TRIP
        // ----------------------------------------

        const tripRevenue =
          customerLegs.reduce(
            (sum, leg) =>
              sum +
              Number(
                leg.estimatedFreightAmount || 0,
              ),
            0,
          );

        customerRevenue += tripRevenue;

        // ----------------------------------------
        // STORE CUSTOMER TRIP
        // ----------------------------------------

        customerTrips.push({
          tripId: trip._id,

          tripNo:
            trip.tripNo || null,

          tripStatus:
            trip.tripStatus || null,

          journeyType:
            trip.journeyType || null,

          vehicleId:
            trip.vehicleId || null,

          revenue:
            tripRevenue,

          legs: customerLegs.map((leg) => ({
            legNo: leg.legNo,

            from:
              leg.from || null,

            to:
              leg.to || null,

            customerId:
              leg.customerId || null,

            freightAmount:
              Number(
                leg.estimatedFreightAmount || 0,
              ),

            weight:
              Number(leg.weight || 0),

            uom:
              leg.uom || null,

            amountPerTon:
              Number(
                leg.amountPerTon || 0,
              ),

            legStatus:
              leg.legStatus || null,
          })),
        });
      }

      // ==========================================
      // CUSTOMER OUTSTANDING
      //
      // Customer document is currently the source
      // of truth for outstanding amount.
      // ==========================================

      const customerOutstandingAmount =
        Number(
          customer.outstandingAmount || 0,
        );

      // ==========================================
      // ACTIVE TRIPS
      // ==========================================

      const activeTrips =
        customerTrips.filter((trip) =>
          [
            "Pre Trip Pending",
            "Ready To Start",
            "In Transit",
            "Post Trip Pending",
            "Documents Pending",
          ].includes(
            trip.tripStatus,
          ),
        );

      // ==========================================
      // GLOBAL TOTALS
      // ==========================================

      totalTrips += customerTrips.length;

      totalRevenue += customerRevenue;

      outstandingAmount +=
        customerOutstandingAmount;

      // ==========================================
      // CUSTOMER DASHBOARD
      // ==========================================

      dashboard.push({
        _id: customer._id,

        customerId:
          customer.customerId,

        companyName:
          customer.companyName,

        contactPerson:
          customer.contactPerson,

        mobile:
          customer.mobile,

        status:
          customer.status,

        totalTrips:
          customerTrips.length,

        totalRevenue:
          customerRevenue,

        outstandingAmount:
          customerOutstandingAmount,

        activeTrips:
          activeTrips.length,

        currentTrips:
          activeTrips.map((trip) => ({
            tripId:
              trip.tripId,

            tripNo:
              trip.tripNo,

            tripStatus:
              trip.tripStatus,

            journeyType:
              trip.journeyType,

            vehicleId:
              trip.vehicleId,

            revenue:
              trip.revenue,

            legs:
              trip.legs,
          })),
      });
    }

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalCustomers,

          activeCustomers,

          inactiveCustomers,

          totalTrips,

          totalRevenue,

          outstandingAmount,
        },

        customers:
          dashboard,
      },
    });
  } catch (error) {
    console.error(
      "getCustomerDashboard error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to fetch customer dashboard",
    });
  }
};