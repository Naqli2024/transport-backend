const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const FuelEntry = require("../models/FuelEntry");
const TripExpense = require("../models/TripExpense");
const mongoose = require("mongoose");

const {
  uploadFile,
  getSignedUrl,
  deleteFile,
  replaceFile,
} = require("../utils/gcpUpload");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* =========================================================
   CREATE DRIVER
========================================================= */

exports.createDriver = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const {
      userName,
      password,
      mobile,
      dlNo,
    } = req.body;

    // =====================================================
    // REQUIRED LOGIN FIELDS
    // =====================================================

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // =====================================================
    // DUPLICATE USERNAME
    // =====================================================

    const existingUsername = await Driver.findOne({
      businessId,
      userName: userName.toLowerCase(),
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // =====================================================
    // DUPLICATE MOBILE
    // =====================================================

    const existingMobile = await Driver.findOne({
      businessId,
      mobile,
    });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    // =====================================================
    // DUPLICATE LICENSE
    // =====================================================

    if (dlNo) {
      const existingLicense = await Driver.findOne({
        businessId,
        dlNo: dlNo.toUpperCase(),
      });

      if (existingLicense) {
        return res.status(400).json({
          success: false,
          message: "License already exists",
        });
      }
    }

    // =====================================================
    // HASH PASSWORD
    // =====================================================

    const hashedPassword = await bcrypt.hash(password, 10);

    // =====================================================
    // CREATE DRIVER
    // =====================================================

    const driver = await Driver.create({
      businessId,
      ...req.body,
      userName: userName.toLowerCase(),
      password: hashedPassword,
      ...(dlNo && {
        dlNo: dlNo.toUpperCase(),
      }),
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    const driverResponse = driver.toObject();

    delete driverResponse.password;

    return res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: driverResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Username or driver ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   GET ALL DRIVERS
========================================================= */

exports.getDrivers = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const drivers = await Driver.find({
      businessId,
    })
      .populate("vehicle.vehicleId")
      .populate("currentTripId", "tripNo tripStatus currentLeg")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   GET SINGLE DRIVER
========================================================= */

exports.getDriver = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { driverId } = req.params;

    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    })
      .populate("vehicle.vehicleId")
      .populate(
        "currentTripId",
        "tripNo tripStatus currentLeg journeyType",
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: driver,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   UPDATE DRIVER
========================================================= */

exports.updateDriver = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { driverId } = req.params;

    // =====================================================
    // CHECK DRIVER
    // =====================================================

    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    }).select("+password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // =====================================================
    // DUPLICATE USERNAME
    // =====================================================

    if (req.body.userName) {
      const existingUsername =
        await Driver.findOne({
          businessId,
          userName:
            req.body.userName.toLowerCase(),
          _id: {
            $ne: driverId,
          },
        });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }
    }

    // =====================================================
    // DUPLICATE MOBILE
    // =====================================================

    if (req.body.mobile) {
      const existingMobile =
        await Driver.findOne({
          businessId,
          mobile: req.body.mobile,
          _id: {
            $ne: driverId,
          },
        });

      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    // =====================================================
    // DUPLICATE LICENSE
    // =====================================================

    if (req.body.dlNo) {
      const existingLicense =
        await Driver.findOne({
          businessId,
          dlNo: req.body.dlNo.toUpperCase(),
          _id: {
            $ne: driverId,
          },
        });

      if (existingLicense) {
        return res.status(400).json({
          success: false,
          message: "License already exists",
        });
      }
    }

    // =====================================================
    // PREPARE UPDATE
    // =====================================================

    const updateData = {
      ...req.body,
    };

    // =====================================================
    // USERNAME
    // =====================================================

    if (req.body.userName) {
      updateData.userName =
        req.body.userName.toLowerCase();
    }

    // =====================================================
    // PASSWORD
    // =====================================================

    if (req.body.password) {
      updateData.password =
        await bcrypt.hash(
          req.body.password,
          10,
        );
    }

    // =====================================================
    // LICENSE
    // =====================================================

    if (req.body.dlNo) {
      updateData.dlNo =
        req.body.dlNo.toUpperCase();
    }

    // =====================================================
    // UPDATE
    // =====================================================

    const updatedDriver =
      await Driver.findOneAndUpdate(
        {
          _id: driverId,
          businessId,
        },
        updateData,
        {
          new: true,
          runValidators: true,
        },
      )
        .populate("vehicle.vehicleId")
        .populate(
          "currentTripId",
          "tripNo tripStatus currentLeg journeyType",
        );

    // =====================================================
    // REMOVE PASSWORD
    // =====================================================

    const driverResponse =
      updatedDriver.toObject();

    delete driverResponse.password;

    return res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: driverResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Username or driver ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   UPDATE DRIVER LOCATION
========================================================= */

exports.updateDriverLocation = async (req, res) => {
  try {
    const businessId = req.driver?.businessId;
    const { driverId } = req.params;

    const { lat, lng } = req.body;

    if (
      lat === undefined ||
      lng === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude and Longitude are required",
      });
    }

    const driver = await Driver.findOneAndUpdate(
      {
        _id: driverId,
        businessId,
      },
      {
        lat: Number(lat),
        lng: Number(lng),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Driver location updated successfully",
      data: {
        _id: driver._id,
        driverId: driver.driverId,
        name: driver.name,
        lat: driver.lat,
        lng: driver.lng,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* =========================================================
   DELETE DRIVER
========================================================= */

exports.deleteDriver = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const driver =
      await Driver.findOne({
        _id: req.params.driverId,
        businessId,
      });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    await Driver.deleteOne({
      _id: req.params.driverId,
      businessId,
    });

    return res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   DRIVER DASHBOARD
========================================================= */

exports.getDriverDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const drivers = await Driver.find({
      businessId,
    })
      .populate("vehicle.vehicleId")
      .sort({ createdAt: -1 });

    const totalDrivers = drivers.length;

    const available = drivers.filter(
      (d) =>
        d.availableStatus === "Available",
    ).length;

    const reserved = drivers.filter(
      (d) =>
        d.availableStatus === "Reserved",
    ).length;

    const onTrip = drivers.filter(
      (d) =>
        d.availableStatus === "On Trip",
    ).length;

    const onLeave = drivers.filter(
      (d) =>
        d.availableStatus === "On Leave",
    ).length;

    // Latest Driver model also contains:
    // Resting / Sick Leave / Inactive

    const resting = drivers.filter(
      (d) =>
        d.availableStatus === "Resting",
    ).length;

    const sickLeave = drivers.filter(
      (d) =>
        d.availableStatus === "Sick Leave",
    ).length;

    const inactive = drivers.filter(
      (d) =>
        d.availableStatus === "Inactive",
    ).length;

    const assigned = drivers.filter(
      (d) =>
        d.vehicle?.status === "Assigned",
    ).length;

    const unassigned = drivers.filter(
      (d) =>
        d.vehicle?.status === "Unassigned",
    ).length;

    // =====================================================
    // LICENSE EXPIRY
    // =====================================================

    const today = new Date();

    let licenseExpiring = 0;

    drivers.forEach((driver) => {
      if (!driver.licenseExpiryDate) {
        return;
      }

      const expiry = new Date(
        driver.licenseExpiryDate,
      );

      const diffDays = Math.ceil(
        (expiry - today) /
          (1000 * 60 * 60 * 24),
      );

      if (
        diffDays >= 0 &&
        diffDays <= 30
      ) {
        licenseExpiring++;
      }
    });

    // =====================================================
    // ACTIVE TRIPS
    // =====================================================

    const activeTrips = await Trip.find({
      businessId,
      tripStatus: {
        $in: [
          "Pre Trip Pending",
          "Inspection Pending",
          "Ready For Loading",
          "Reached Pickup",
          "Loading",
          "Documents Pending",
          "Ready To Start",
          "In Transit",
          "Unloading",
          "Delivery OTP Pending",
        ],
      },
    })
      .select(
        "_id tripNo tripStatus journeyType currentLeg vehicleId journeyLegs",
      )
      .lean();

    // =====================================================
    // DRIVER DETAILS
    // =====================================================

    const driverDetails = drivers.map(
      (driver) => {
        const driverIdString =
          driver._id.toString();

        // Find trip where this driver is
        // assigned to the CURRENT LEG
        const currentTrip =
          activeTrips.find((trip) => {
            const legIndex =
              (trip.currentLeg || 1) - 1;

            const currentLeg =
              trip.journeyLegs?.[
                legIndex
              ];

            if (!currentLeg) {
              return false;
            }

            return (
              currentLeg.driver1
                ?.toString() ===
                driverIdString ||
              currentLeg.driver2
                ?.toString() ===
                driverIdString
            );
          });

        return {
          ...driver.toObject(),

          currentTrip: currentTrip
            ? {
                tripId:
                  currentTrip._id,
                tripNo:
                  currentTrip.tripNo,
                tripStatus:
                  currentTrip.tripStatus,
                journeyType:
                  currentTrip.journeyType,
                currentLeg:
                  currentTrip.currentLeg,
                vehicleId:
                  currentTrip.vehicleId,
              }
            : null,
        };
      },
    );

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalDrivers,
          available,
          reserved,
          onTrip,
          onLeave,
          resting,
          sickLeave,
          inactive,
          assigned,
          unassigned,
          licenseExpiring,
          activeTrips:
            activeTrips.length,
        },

        drivers: driverDetails,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   INDIVIDUAL DRIVER DASHBOARD
========================================================= */

exports.getIndividualDriverDashboard =
  async (req, res) => {
    try {
      const businessId =
        req.driver.businessId;

      const { driverId } =
        req.params;

      // ===================================================
      // DRIVER
      // ===================================================

      const driver =
        await Driver.findOne({
          _id: driverId,
          businessId,
        })
          .populate("vehicle.vehicleId")
          .populate(
            "currentTripId",
            "tripNo tripStatus currentLeg journeyType",
          );

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // ===================================================
      // FIND ALL TRIPS WHERE DRIVER APPEARS
      // IN ANY JOURNEY LEG
      // ===================================================

      const trips =
        await Trip.find({
          businessId,

          journeyLegs: {
            $elemMatch: {
              $or: [
                {
                  driver1:
                    driverId,
                },
                {
                  driver2:
                    driverId,
                },
              ],
            },
          },
        }).sort({
          createdAt: -1,
        });

      // ===================================================
      // STATUS GROUPS
      // ===================================================

      const runningStatuses = [
        "Pre Trip Pending",
        "Inspection Pending",
        "Ready For Loading",
        "Reached Pickup",
        "Loading",
        "Documents Pending",
        "Ready To Start",
        "In Transit",
        "Unloading",
        "Delivery OTP Pending",
      ];

      const completedTrips =
        trips.filter(
          (trip) =>
            trip.tripStatus ===
            "Completed",
        );

      const runningTrips =
        trips.filter((trip) =>
          runningStatuses.includes(
            trip.tripStatus,
          ),
        );

      const cancelledTrips =
        trips.filter(
          (trip) =>
            trip.tripStatus ===
            "Cancelled",
        );

      // ===================================================
      // DISTANCE
      // ===================================================

      const totalDistance =
        completedTrips.reduce(
          (sum, trip) =>
            sum +
            Number(
              trip.distanceTravelled ||
                0,
            ),
          0,
        );

      // ===================================================
      // FUEL
      // ===================================================

      const fuelEntries =
        await FuelEntry.find({
          businessId,
          driverId,
        });

      const totalFuel =
        fuelEntries.reduce(
          (sum, fuel) =>
            sum +
            Number(
              fuel.quantity || 0,
            ),
          0,
        );

      // ===================================================
      // CURRENT TRIP
      // ===================================================

      const currentTrip =
        trips.find((trip) =>
          runningStatuses.includes(
            trip.tripStatus,
          ),
        );

      // ===================================================
      // TRIP HISTORY
      // ===================================================

      const tripHistory =
        trips.map((trip) => {
          const driverLegs =
            trip.journeyLegs.filter(
              (leg) =>
                leg.driver1
                  ?.toString() ===
                  driverId.toString() ||
                leg.driver2
                  ?.toString() ===
                  driverId.toString(),
            );

          const totalDriverAdvance =
            driverLegs.reduce(
              (sum, leg) =>
                sum +
                (leg.driverAdvance ||
                  []).reduce(
                    (
                      advanceSum,
                      advance,
                    ) =>
                      advanceSum +
                      Number(
                        advance.amount ||
                          0,
                      ),
                    0,
                  ),
              0,
            );

          const legDistance =
            driverLegs.reduce(
              (sum, leg) =>
                sum +
                Number(
                  leg.distanceTravelled ||
                    0,
                ),
              0,
            );

          return {
            tripId: trip._id,
            tripNo: trip.tripNo,
            journeyType:
              trip.journeyType,
            tripStatus:
              trip.tripStatus,

            currentLeg:
              trip.currentLeg,

            distanceTravelled:
              legDistance,

            driverAdvance:
              totalDriverAdvance,

            totalFuelQuantity:
              Number(
                trip.totalFuelQuantity ||
                  0,
              ),

            completedAt:
              trip.completedAt,
          };
        });

      // ===================================================
      // RESPONSE
      // ===================================================

      return res.status(200).json({
        success: true,

        data: {
          summary: {
            driverName:
              driver.name,

            driverCode:
              driver.driverId,

            mobile:
              driver.mobile,

            availableStatus:
              driver.availableStatus,

            vehicle:
              driver.vehicle,

            totalTrips:
              trips.length,

            completedTrips:
              completedTrips.length,

            runningTrips:
              runningTrips.length,

            cancelledTrips:
              cancelledTrips.length,

            totalDistance,

            totalFuel,

            fuelEntries:
              fuelEntries.length,

            score:
              driver.score,

            joiningDate:
              driver.createdAt,

            licenseExpiryDate:
              driver.licenseExpiryDate,
          },

          currentTrip,

          tripHistory,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

/* =========================================================
   GET CURRENT DRIVER TRIP
========================================================= */

exports.getCurrentTrip = async (
  req,
  res,
) => {
  try {
    const businessId =
      req.driver.businessId;

    const driverId =
      req.driver.driverId ||
      req.driver._id;

    // =====================================================
    // FIND TRIP WHERE DRIVER IS ASSIGNED
    // TO CURRENT ACTIVE LEG
    // =====================================================

    const trips =
      await Trip.find({
        businessId,

        tripStatus: {
          $in: [
            "Pre Trip Pending",
            "Inspection Pending",
            "Ready For Loading",
            "Reached Pickup",
            "Loading",
            "Documents Pending",
            "Ready To Start",
            "In Transit",
            "Unloading",
            "Delivery OTP Pending",
          ],
        },

        journeyLegs: {
          $elemMatch: {
            $or: [
              {
                driver1: driverId,
              },
              {
                driver2: driverId,
              },
            ],
          },
        },
      }).sort({
        createdAt: -1,
      });

    let trip = null;

    for (const candidate of trips) {
      const legIndex =
        (candidate.currentLeg || 1) -
        1;

      const currentLeg =
        candidate.journeyLegs?.[
          legIndex
        ];

      if (!currentLeg) {
        continue;
      }

      const isAssigned =
        currentLeg.driver1
          ?.toString() ===
          driverId.toString() ||
        currentLeg.driver2
          ?.toString() ===
          driverId.toString();

      if (isAssigned) {
        trip = candidate;
        break;
      }
    }

    if (!trip) {
      return res.status(200).json({
        success: true,
        message:
          "No active trip assigned",
        data: null,
      });
    }

    // =====================================================
    // CURRENT LEG
    // =====================================================

    const currentLegIndex =
      (trip.currentLeg || 1) - 1;

    const currentLeg =
      trip.journeyLegs[
        currentLegIndex
      ];

    // =====================================================
    // WEIGHBRIDGE RECEIPT
    // =====================================================

    const fileUrl =
      currentLeg?.weighbridge
        ?.receiptPath
        ? await getSignedUrl(
            currentLeg.weighbridge
              .receiptPath,
            businessId,
          )
        : null;

    // =====================================================
    // LOADING / UNLOADING EXPENSES
    // =====================================================

    const expenses =
      await TripExpense.find({
        businessId,
        tripId: trip._id,
        legNo: currentLeg.legNo,

        expenseType: {
          $in: [
            "Loading",
            "Unloading",
          ],
        },
      }).lean();

    const loadingExpense =
      expenses.find(
        (x) =>
          x.expenseType ===
          "Loading",
      );

    const unloadingExpense =
      expenses.find(
        (x) =>
          x.expenseType ===
          "Unloading",
      );

    // =====================================================
    // SIGNED BILL URLS
    // =====================================================

    const loadingExpenseData =
      loadingExpense
        ? {
            ...loadingExpense,

            fileUrl:
              loadingExpense.filePath
                ? await getSignedUrl(
                    loadingExpense.filePath,
                    businessId,
                  )
                : null,
          }
        : null;

    const unloadingExpenseData =
      unloadingExpense
        ? {
            ...unloadingExpense,

            fileUrl:
              unloadingExpense.filePath
                ? await getSignedUrl(
                    unloadingExpense.filePath,
                    businessId,
                  )
                : null,
          }
        : null;

    // =====================================================
    // RESPONSE
    // =====================================================

    const tripData =
      trip.toObject();

    return res.status(200).json({
      success: true,

      data: {
        ...tripData,

        // Explicit current leg
        currentJourneyLeg:
          currentLeg,

        // Expense shortcuts
        loadingExpense:
          loadingExpenseData,

        unloadingExpense:
          unloadingExpenseData,

        // PC is already stored
        // inside currentJourneyLeg.PC

        currentLegWeighbridge: {
          ...(currentLeg.weighbridge ||
            {}),
          fileUrl,
        },
      },
    });
  } catch (error) {
    console.error(
      "getCurrentTrip error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   DRIVER SETTLEMENT
========================================================= */

exports.getDriverSettlement = async (req, res) => {
  try {
    const { driverId } = req.params;

    // ============================================
    // VALIDATE DRIVER ID
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID",
      });
    }

    const businessId = req.user.businessId;

    // ============================================
    // FIND DRIVER
    // ============================================

    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    }).lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // ============================================
    // FIND ALL COMPLETED TRIPS
    // WHERE THIS DRIVER WORKED IN ANY LEG
    // ============================================

    const trips = await Trip.find({
      businessId,
      status: "Completed",
      journey: {
        $elemMatch: {
          $or: [
            { driver1: driver._id },
            { driver2: driver._id },
          ],
        },
      },
    })
      .sort({ createdAt: 1 })
      .lean();

    // ============================================
    // DRIVER LEVEL EXISTING SETTLEMENT
    // ============================================

    const existingSettledAmount = Number(
      driver.settlement?.settledAmount || 0
    );

    // ============================================
    // TOTAL CALCULATION
    // ============================================

    let totalDriverSalary = 0;
    let totalAdvance = 0;
    let totalExpense = 0;
    let totalOfficeShouldPay = 0;
    let totalDriverShouldReturn = 0;

    const settlementTrips = [];

    // ============================================
    // PROCESS ALL COMPLETED TRIPS
    // ============================================

    for (const trip of trips) {
      // --------------------------------------------
      // FIND DRIVER'S LEGS
      // --------------------------------------------

      const driverLegs = (trip.journey || []).filter((leg) => {
        const driver1 = leg.driver1?.toString();
        const driver2 = leg.driver2?.toString();

        return (
          driver1 === driverId.toString() ||
          driver2 === driverId.toString()
        );
      });

      if (!driverLegs.length) {
        continue;
      }

      // --------------------------------------------
      // GET LEG NUMBERS
      // --------------------------------------------

      const legNos = driverLegs.map(
        (leg) => leg.legNo
      );

      // --------------------------------------------
      // FIND EXPENSES FOR THIS DRIVER + TRIP
      // --------------------------------------------

      const expenses = await TripExpense.find({
        businessId,
        tripId: trip._id,
        driverId: driver._id,
        legNo: {
          $in: legNos,
        },
      }).lean();

      // --------------------------------------------
      // TRIP TOTALS
      // --------------------------------------------

      let tripDriverSalary = 0;
      let tripAdvance = 0;
      let tripExpense = 0;
      let tripOfficeShouldPay = 0;
      let tripDriverShouldReturn = 0;

      const legs = [];

      // ============================================
      // PROCESS EACH DRIVER LEG
      // ============================================

      for (const leg of driverLegs) {
        // ------------------------------------------
        // GET EXPENSES FOR THIS LEG ONLY
        // ------------------------------------------

        const legExpenses = expenses.filter(
          (expense) =>
            Number(expense.legNo) ===
            Number(leg.legNo)
        );

        // ------------------------------------------
        // EXPENSE TOTAL HELPER
        // ------------------------------------------

        const getExpenseTotal = (field) => {
          return legExpenses.reduce(
            (sum, expense) =>
              sum + Number(expense[field] || 0),
            0
          );
        };

        // ------------------------------------------
        // DRIVER SALARY
        // ------------------------------------------

        const driverSalary = Number(
          leg.driverSalary || 0
        );

        // ------------------------------------------
        // DRIVER ADVANCE
        // ------------------------------------------

        const driverAdvance = Number(
          leg.driverAdvance || 0
        );

        // ------------------------------------------
        // EXPENSES
        // ------------------------------------------

        const PC = getExpenseTotal("PC");

        const weighbridge =
          getExpenseTotal("weighbridge");

        // Fuel is calculated for this exact leg.
        const fuel =
          getExpenseTotal("fuel");

        const loading =
          getExpenseTotal("loading");

        const unloading =
          getExpenseTotal("unloading");

        const parking =
          getExpenseTotal("parking");

        const repair =
          getExpenseTotal("repair");

        const miscellaneous =
          getExpenseTotal("miscellaneous");

        // ------------------------------------------
        // ACTUAL EXPENSE
        // ------------------------------------------

        const actualExpense =
          PC +
          weighbridge +
          fuel +
          loading +
          unloading +
          parking +
          repair +
          miscellaneous;

        // ------------------------------------------
        // OFFICE PAY / DRIVER RETURN
        // ------------------------------------------

        let officePay = 0;
        let driverReturn = 0;

        if (actualExpense > driverAdvance) {
          officePay =
            actualExpense -
            driverAdvance;
        } else {
          driverReturn =
            driverAdvance -
            actualExpense;
        }

        // ------------------------------------------
        // ADD TO TRIP TOTALS
        // ------------------------------------------

        tripDriverSalary += driverSalary;
        tripAdvance += driverAdvance;
        tripExpense += actualExpense;
        tripOfficeShouldPay += officePay;
        tripDriverShouldReturn += driverReturn;

        // ------------------------------------------
        // LEG DISPLAY DATA ONLY
        // ------------------------------------------

        legs.push({
          legNo: leg.legNo,

          from: leg.from,
          to: leg.to,

          driver1: leg.driver1,
          driver2: leg.driver2,

          driverSalary,

          freightAmount: Number(
            leg.estimatedFreightAmount || 0
          ),

          driverAdvance,

          PC,
          weighbridge,
          fuel,
          loading,
          unloading,
          parking,
          repair,
          miscellaneous,

          actualExpense,

          officePay,

          driverReturn,
        });
      }

      // ============================================
      // ADD TRIP TOTALS TO DRIVER TOTAL
      // ============================================

      totalDriverSalary +=
        tripDriverSalary;

      totalAdvance +=
        tripAdvance;

      totalExpense +=
        tripExpense;

      totalOfficeShouldPay +=
        tripOfficeShouldPay;

      totalDriverShouldReturn +=
        tripDriverShouldReturn;

      // ============================================
      // TRIP RESPONSE
      // ============================================
      // NOTE:
      // No settlement amount/status/balance here.
      // This is only calculation/display information.
      // ============================================

      settlementTrips.push({
        tripId: trip._id,

        tripNo:
          trip.tripNo || null,

        vehicleId:
          trip.vehicleId || null,

        vehicleNo:
          trip.vehicleNo || null,

        journeyType:
          trip.journeyType || null,

        legs,

        totalDriverSalary:
          tripDriverSalary,

        totalAdvance:
          tripAdvance,

        totalExpense:
          tripExpense,

        officeShouldPay:
          tripOfficeShouldPay,

        driverShouldReturn:
          tripDriverShouldReturn,
      });
    }

    // ============================================
    // DRIVER LEVEL SETTLEMENT
    // ============================================

    const totalPayable =
      totalOfficeShouldPay;

    const settledAmount =
      existingSettledAmount;

    const balanceAmount = Math.max(
      totalPayable -
        settledAmount,
      0
    );

    // ============================================
    // DRIVER SETTLEMENT STATUS
    // ============================================

    let status = "Pending";

    if (totalPayable <= 0) {
      status = "Settled";
    } else if (
      settledAmount >= totalPayable
    ) {
      status = "Settled";
    } else if (
      settledAmount > 0
    ) {
      status = "Partial";
    }

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,

      message:
        "Driver settlement fetched successfully",

      data: {
        driver: {
          _id: driver._id,

          driverId:
            driver.driverId,

          userName:
            driver.userName,

          name:
            driver.name,

          mobile:
            driver.mobile,
        },

        // ========================================
        // DRIVER LEVEL SETTLEMENT
        // ========================================

        settlement: {
          totalPayable,

          settledAmount,

          balanceAmount,

          status,

          lastSettledAt:
            driver.settlement?.lastSettledAt ||
            null,

          remarks:
            driver.settlement?.remarks ||
            "",
        },

        // ========================================
        // CALCULATION SUMMARY
        // ========================================

        summary: {
          totalTrips:
            settlementTrips.length,

          totalDriverSalary,

          totalAdvance,

          totalExpense,

          totalOfficeShouldPay,

          totalDriverShouldReturn,
        },

        // ========================================
        // TRIP / LEG BREAKDOWN
        // ========================================

        trips:
          settlementTrips,
      },
    });
  } catch (error) {
    console.error(
      "getDriverSettlement error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch driver settlement",

      error: error.message,
    });
  }
};


/* =========================================================
   SETTLE DRIVER TRIPS
========================================================= */

exports.settleDriverTrips = async (req, res) => {
  try {
    const { driverId } = req.params;

    const {
      amount,
      remarks,
    } = req.body;

    const businessId = req.user.businessId;

    // ============================================
    // VALIDATE DRIVER ID
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID",
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
    // FIND DRIVER
    // ============================================

    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // ============================================
    // FIND ALL COMPLETED TRIPS
    // ============================================

    const trips = await Trip.find({
      businessId,
      status: "Completed",

      journey: {
        $elemMatch: {
          $or: [
            { driver1: driver._id },
            { driver2: driver._id },
          ],
        },
      },
    })
      .sort({ createdAt: 1 })
      .lean();

    // ============================================
    // CALCULATE DRIVER TOTAL PAYABLE
    // ============================================

    let totalPayable = 0;

    let totalDriverSalary = 0;
    let totalAdvance = 0;
    let totalExpense = 0;
    let totalDriverShouldReturn = 0;

    const settlementTrips = [];

    // ============================================
    // PROCESS ALL COMPLETED TRIPS
    // ============================================

    for (const trip of trips) {
      // --------------------------------------------
      // DRIVER LEGS
      // --------------------------------------------

      const driverLegs = (trip.journey || []).filter(
        (leg) => {
          const driver1 =
            leg.driver1?.toString();

          const driver2 =
            leg.driver2?.toString();

          return (
            driver1 === driverId.toString() ||
            driver2 === driverId.toString()
          );
        }
      );

      if (!driverLegs.length) {
        continue;
      }

      // --------------------------------------------
      // LEG NUMBERS
      // --------------------------------------------

      const legNos = driverLegs.map(
        (leg) => leg.legNo
      );

      // --------------------------------------------
      // FIND EXPENSES
      // --------------------------------------------

      const expenses =
        await TripExpense.find({
          businessId,
          tripId: trip._id,
          driverId: driver._id,
          legNo: {
            $in: legNos,
          },
        }).lean();

      // --------------------------------------------
      // TRIP TOTALS
      // --------------------------------------------

      let tripDriverSalary = 0;
      let tripAdvance = 0;
      let tripExpense = 0;
      let tripOfficeShouldPay = 0;
      let tripDriverShouldReturn = 0;

      const legs = [];

      // ============================================
      // PROCESS EACH LEG
      // ============================================

      for (const leg of driverLegs) {
        // ------------------------------------------
        // EXPENSES FOR THIS LEG
        // ------------------------------------------

        const legExpenses =
          expenses.filter(
            (expense) =>
              Number(expense.legNo) ===
              Number(leg.legNo)
          );

        // ------------------------------------------
        // EXPENSE TOTAL HELPER
        // ------------------------------------------

        const getExpenseTotal = (field) => {
          return legExpenses.reduce(
            (sum, expense) =>
              sum +
              Number(expense[field] || 0),
            0
          );
        };

        // ------------------------------------------
        // DRIVER SALARY
        // ------------------------------------------

        const driverSalary = Number(
          leg.driverSalary || 0
        );

        // ------------------------------------------
        // DRIVER ADVANCE
        // ------------------------------------------

        const driverAdvance = Number(
          leg.driverAdvance || 0
        );

        // ------------------------------------------
        // EXPENSES
        // ------------------------------------------

        const PC =
          getExpenseTotal("PC");

        const weighbridge =
          getExpenseTotal(
            "weighbridge"
          );

        // IMPORTANT:
        // Fuel is calculated for this exact leg.
        const fuel =
          getExpenseTotal("fuel");

        const loading =
          getExpenseTotal("loading");

        const unloading =
          getExpenseTotal("unloading");

        const parking =
          getExpenseTotal("parking");

        const repair =
          getExpenseTotal("repair");

        const miscellaneous =
          getExpenseTotal(
            "miscellaneous"
          );

        // ------------------------------------------
        // ACTUAL EXPENSE
        // ------------------------------------------

        const actualExpense =
          PC +
          weighbridge +
          fuel +
          loading +
          unloading +
          parking +
          repair +
          miscellaneous;

        // ------------------------------------------
        // OFFICE PAY / DRIVER RETURN
        // ------------------------------------------

        let officePay = 0;
        let driverReturn = 0;

        if (
          actualExpense >
          driverAdvance
        ) {
          officePay =
            actualExpense -
            driverAdvance;
        } else {
          driverReturn =
            driverAdvance -
            actualExpense;
        }

        // ------------------------------------------
        // TRIP TOTALS
        // ------------------------------------------

        tripDriverSalary +=
          driverSalary;

        tripAdvance +=
          driverAdvance;

        tripExpense +=
          actualExpense;

        tripOfficeShouldPay +=
          officePay;

        tripDriverShouldReturn +=
          driverReturn;

        // ------------------------------------------
        // LEG DISPLAY DATA
        // ------------------------------------------

        legs.push({
          legNo:
            leg.legNo,

          from:
            leg.from,

          to:
            leg.to,

          driver1:
            leg.driver1,

          driver2:
            leg.driver2,

          driverSalary,

          freightAmount:
            Number(
              leg.estimatedFreightAmount ||
              0
            ),

          driverAdvance,

          PC,
          weighbridge,
          fuel,
          loading,
          unloading,
          parking,
          repair,
          miscellaneous,

          actualExpense,

          officePay,

          driverReturn,
        });
      }

      // ============================================
      // ADD TO DRIVER TOTALS
      // ============================================

      totalPayable +=
        tripOfficeShouldPay;

      totalDriverSalary +=
        tripDriverSalary;

      totalAdvance +=
        tripAdvance;

      totalExpense +=
        tripExpense;

      totalDriverShouldReturn +=
        tripDriverShouldReturn;

      // ============================================
      // STORE TRIP CALCULATION
      // ============================================

      settlementTrips.push({
        tripId:
          trip._id,

        tripNo:
          trip.tripNo || null,

        vehicleId:
          trip.vehicleId || null,

        vehicleNo:
          trip.vehicleNo || null,

        journeyType:
          trip.journeyType || null,

        legs,

        totalDriverSalary:
          tripDriverSalary,

        totalAdvance:
          tripAdvance,

        totalExpense:
          tripExpense,

        officeShouldPay:
          tripOfficeShouldPay,

        driverShouldReturn:
          tripDriverShouldReturn,
      });
    }

    // ============================================
    // EXISTING DRIVER SETTLEMENT
    // ============================================

    const previousSettledAmount = Number(
      driver.settlement?.settledAmount || 0
    );

    // ============================================
    // CURRENT DRIVER BALANCE
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
          "Settlement amount cannot be greater than driver's outstanding balance",

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
    // NEW DRIVER SETTLED AMOUNT
    // ============================================

    const newSettledAmount =
      previousSettledAmount +
      settlementAmount;

    // ============================================
    // NEW DRIVER BALANCE
    // ============================================

    const newBalanceAmount =
      Math.max(
        totalPayable -
          newSettledAmount,
        0
      );

    // ============================================
    // NEW DRIVER STATUS
    // ============================================

    let newStatus = "Pending";

    if (
      totalPayable <= 0
    ) {
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
    // UPDATE DRIVER SETTLEMENT
    // ============================================

    driver.settlement.totalPayable =
      totalPayable;

    driver.settlement.settledAmount =
      newSettledAmount;

    driver.settlement.balanceAmount =
      newBalanceAmount;

    driver.settlement.status =
      newStatus;

    driver.settlement.lastSettledAt =
      new Date();

    if (remarks !== undefined) {
      driver.settlement.remarks =
        remarks;
    }

    // ============================================
    // SAVE TRIP / LEG CALCULATION HISTORY
    // ============================================
    // IMPORTANT:
    // These trips contain calculation information
    // only. No settlement amount/status is stored
    // against individual trips or legs.
    // ============================================

    driver.settlement.trips =
      settlementTrips;

    // ============================================
    // MARK SETTLEMENT MODIFIED
    // ============================================

    driver.markModified(
      "settlement"
    );

    // ============================================
    // SAVE DRIVER
    // ============================================

    await driver.save();

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,

      message:
        "Driver settlement completed successfully",

      data: {
        driverId:
          driver._id,

        driverCode:
          driver.driverId,

        // ----------------------------------------
        // DRIVER LEVEL SETTLEMENT
        // ----------------------------------------

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
          driver.settlement.lastSettledAt,

        remarks:
          driver.settlement.remarks || "",

        // ----------------------------------------
        // CALCULATION SUMMARY
        // ----------------------------------------

        summary: {
          totalTrips:
            settlementTrips.length,

          totalDriverSalary,

          totalAdvance,

          totalExpense,

          totalOfficeShouldPay:
            totalPayable,

          totalDriverShouldReturn,
        },
      },
    });
  } catch (error) {
    console.error(
      "settleDriverTrips error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to settle driver trips",

      error: error.message,
    });
  }
};