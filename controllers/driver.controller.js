const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const FuelEntry = require("../models/FuelEntry");
const TripExpense = require("../models/TripExpense");

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
    const businessId = req.user.businessId;
    const { driverId } = req.params;

    // ===================================================
    // DRIVER
    // ===================================================

    const driver = await Driver.findOne({
      _id: driverId,
      businessId,
    }).select(
      "name mobile driverId settlement"
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // ===================================================
    // COMPLETED TRIPS
    // WHERE DRIVER WAS ASSIGNED TO ANY LEG
    // ===================================================

    const trips = await Trip.find({
      businessId,

      tripStatus: "Completed",

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
    })
      .populate("vehicleId", "regNo")
      .sort({
        completedAt: -1,
      });

    // ===================================================
    // ALREADY SETTLED TRIP IDS FOR THIS DRIVER
    // ===================================================

    const settledTripIds = new Set(
      (driver.settlement?.trips || [])
        .filter(
          (settlementTrip) =>
            settlementTrip.status ===
            "Settled"
        )
        .map((settlementTrip) =>
          settlementTrip.tripId.toString()
        )
    );

    // ===================================================
    // ROUNDING
    // ===================================================

    const round = (value) =>
      Number(
        Number(value || 0).toFixed(2)
      );

    let totalDriverSalary = 0;
    let totalAdvance = 0;
    let totalExpense = 0;
    let officeShouldPay = 0;
    let driverShouldReturn = 0;

    const tripData = [];

    // ===================================================
    // EACH TRIP
    // ===================================================

    for (const trip of trips) {
      // -------------------------------------------------
      // Ignore already settled trip for this driver
      // -------------------------------------------------

      if (
        settledTripIds.has(
          trip._id.toString()
        )
      ) {
        continue;
      }

      // -------------------------------------------------
      // DRIVER'S LEGS ONLY
      // -------------------------------------------------

      const driverLegs =
        (trip.journeyLegs || []).filter(
          (leg) =>
            leg.driver1?.toString() ===
              driverId.toString() ||
            leg.driver2?.toString() ===
              driverId.toString()
        );

      if (driverLegs.length === 0) {
        continue;
      }

      // -------------------------------------------------
      // DRIVER LEG NUMBERS
      // -------------------------------------------------

      const driverLegNos =
        driverLegs.map(
          (leg) => Number(leg.legNo)
        );

      // -------------------------------------------------
      // TRIP EXPENSES
      // -------------------------------------------------

      const expenses =
        await TripExpense.find({
          businessId,
          tripId: trip._id,

          driverId,

          legNo: {
            $in: driverLegNos,
          },
        }).lean();

      // -------------------------------------------------
      // DRIVER SALARY
      // -------------------------------------------------

      const driverSalary =
        driverLegs.reduce(
          (sum, leg) =>
            sum +
            Number(
              leg.driverSalary || 0
            ),
          0
        );

      // -------------------------------------------------
      // DRIVER ADVANCE
      // -------------------------------------------------

      const advance =
        driverLegs.reduce(
          (sum, leg) =>
            sum +
            (leg.driverAdvance || [])
              .reduce(
                (
                  advanceSum,
                  advanceEntry
                ) =>
                  advanceSum +
                  Number(
                    advanceEntry.amount ||
                      0
                  ),
                0
              ),
          0
        );

      // -------------------------------------------------
      // LOADING
      // -------------------------------------------------

      const loading =
        expenses
          .filter(
            (e) =>
              e.expenseType ===
              "Loading"
          )
          .reduce(
            (sum, e) =>
              sum +
              Number(
                e.amount || 0
              ),
            0
          );

      // -------------------------------------------------
      // UNLOADING
      // -------------------------------------------------

      const unloading =
        expenses
          .filter(
            (e) =>
              e.expenseType ===
              "Unloading"
          )
          .reduce(
            (sum, e) =>
              sum +
              Number(
                e.amount || 0
              ),
            0
          );

      // -------------------------------------------------
      // PARKING
      // -------------------------------------------------

      const parking =
        expenses
          .filter(
            (e) =>
              e.expenseType ===
              "Parking"
          )
          .reduce(
            (sum, e) =>
              sum +
              Number(
                e.amount || 0
              ),
            0
          );

      // -------------------------------------------------
      // REPAIR
      // -------------------------------------------------

      const repair =
        expenses
          .filter(
            (e) =>
              e.expenseType ===
              "Repair"
          )
          .reduce(
            (sum, e) =>
              sum +
              Number(
                e.amount || 0
              ),
            0
          );

      // -------------------------------------------------
      // MISCELLANEOUS
      // -------------------------------------------------

      const miscellaneous =
        expenses
          .filter(
            (e) =>
              e.expenseType ===
              "Miscellaneous"
          )
          .reduce(
            (sum, e) =>
              sum +
              Number(
                e.amount || 0
              ),
            0
          );

      // -------------------------------------------------
      // PC
      // -------------------------------------------------

      const PC =
        driverLegs.reduce(
          (sum, leg) =>
            sum +
            Number(
              leg.PC?.amount || 0
            ),
          0
        );

      // -------------------------------------------------
      // FUEL
      // -------------------------------------------------

      const fuel = round(
        trip.totalFuelCost || 0
      );

      // -------------------------------------------------
      // WEIGHBRIDGE
      // -------------------------------------------------

      const weighbridge =
        driverLegs.reduce(
          (sum, leg) =>
            sum +
            Number(
              leg.weighbridge
                ?.weighbridgeFee || 0
            ),
          0
        );

      // -------------------------------------------------
      // ACTUAL EXPENSE
      // -------------------------------------------------

      const actualExpense =
        round(
          fuel +
            loading +
            unloading +
            parking +
            repair +
            miscellaneous +
            PC +
            weighbridge
        );

      // -------------------------------------------------
      // SETTLEMENT CALCULATION
      // -------------------------------------------------

      let officePay = 0;
      let driverReturn = 0;

      if (
        actualExpense > advance
      ) {
        officePay =
          actualExpense -
          advance;
      } else {
        driverReturn =
          advance -
          actualExpense;
      }

      // -------------------------------------------------
      // TOTALS
      // -------------------------------------------------

      totalDriverSalary +=
        driverSalary;

      totalAdvance += advance;

      totalExpense +=
        actualExpense;

      officeShouldPay +=
        officePay;

      driverShouldReturn +=
        driverReturn;

      // -------------------------------------------------
      // DRIVER LEGS
      // -------------------------------------------------

      const legs =
        driverLegs.map(
          (leg) => {
            const legExpenses =
              expenses.filter(
                (expense) =>
                  Number(
                    expense.legNo
                  ) ===
                  Number(
                    leg.legNo
                  )
              );

            const legLoading =
              legExpenses
                .filter(
                  (e) =>
                    e.expenseType ===
                    "Loading"
                )
                .reduce(
                  (sum, e) =>
                    sum +
                    Number(
                      e.amount || 0
                    ),
                  0
                );

            const legUnloading =
              legExpenses
                .filter(
                  (e) =>
                    e.expenseType ===
                    "Unloading"
                )
                .reduce(
                  (sum, e) =>
                    sum +
                    Number(
                      e.amount || 0
                    ),
                  0
                );

            const legParking =
              legExpenses
                .filter(
                  (e) =>
                    e.expenseType ===
                    "Parking"
                )
                .reduce(
                  (sum, e) =>
                    sum +
                    Number(
                      e.amount || 0
                    ),
                  0
                );

            const legRepair =
              legExpenses
                .filter(
                  (e) =>
                    e.expenseType ===
                    "Repair"
                )
                .reduce(
                  (sum, e) =>
                    sum +
                    Number(
                      e.amount || 0
                    ),
                  0
                );

            const legMiscellaneous =
              legExpenses
                .filter(
                  (e) =>
                    e.expenseType ===
                    "Miscellaneous"
                )
                .reduce(
                  (sum, e) =>
                    sum +
                    Number(
                      e.amount || 0
                    ),
                  0
                );

            const legAdvance =
              (
                leg.driverAdvance ||
                []
              ).reduce(
                (sum, entry) =>
                  sum +
                  Number(
                    entry.amount || 0
                  ),
                0
              );

            const legPC =
              Number(
                leg.PC?.amount || 0
              );

            const legWeighbridge =
              Number(
                leg.weighbridge
                  ?.weighbridgeFee ||
                  0
              );

            const legFuel = 0;

            const legActualExpense =
              round(
                legFuel +
                  legLoading +
                  legUnloading +
                  legParking +
                  legRepair +
                  legMiscellaneous +
                  legPC +
                  legWeighbridge
              );

            let legOfficePay = 0;
            let legDriverReturn = 0;

            if (
              legActualExpense >
              legAdvance
            ) {
              legOfficePay =
                legActualExpense -
                legAdvance;
            } else {
              legDriverReturn =
                legAdvance -
                legActualExpense;
            }

            return {
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

              driverSalary:
                round(
                  leg.driverSalary
                ),

              freightAmount:
                round(
                  leg.estimatedFreightAmount
                ),

              driverAdvance:
                round(
                  legAdvance
                ),

              fuel:
                legFuel,

              loading:
                round(
                  legLoading
                ),

              unloading:
                round(
                  legUnloading
                ),

              parking:
                round(
                  legParking
                ),

              repair:
                round(
                  legRepair
                ),

              miscellaneous:
                round(
                  legMiscellaneous
                ),

              PC:
                round(
                  legPC
                ),

              weighbridge:
                round(
                  legWeighbridge
                ),

              actualExpense:
                legActualExpense,

              officePay:
                round(
                  legOfficePay
                ),

              driverReturn:
                round(
                  legDriverReturn
                ),
            };
          }
        );

      // -------------------------------------------------
      // TRIP DATA
      // -------------------------------------------------

      tripData.push({
        tripId:
          trip._id,

        tripNo:
          trip.tripNo,

        vehicleId:
          trip.vehicleId?._id ||
          trip.vehicleId,

        vehicleNo:
          trip.vehicleId?.regNo ||
          "-",

        journeyType:
          trip.journeyType,

        legs,

        totalDriverSalary:
          round(
            driverSalary
          ),

        freightAmount:
          round(
            driverLegs.reduce(
              (sum, leg) =>
                sum +
                Number(
                  leg.estimatedFreightAmount ||
                    0
                ),
              0
            )
          ),

        advance:
          round(
            advance
          ),

        fuel,

        loading:
          round(
            loading
          ),

        unloading:
          round(
            unloading
          ),

        parking:
          round(
            parking
          ),

        repair:
          round(
            repair
          ),

        miscellaneous:
          round(
            miscellaneous
          ),

        PC:
          round(
            PC
          ),

        weighbridge:
          round(
            weighbridge
          ),

        actualExpense,

        officePay:
          round(
            officePay
          ),

        driverReturn:
          round(
            driverReturn
          ),

        status:
          "Pending",
      });
    }

    // ===================================================
    // RESPONSE
    // ===================================================

    return res.status(200).json({
      success: true,

      data: {
        driver: {
          _id:
            driver._id,

          driverId:
            driver.driverId,

          name:
            driver.name,

          mobile:
            driver.mobile,
        },

        summary: {
          totalTrips:
            tripData.length,

          totalDriverSalary:
            round(
              totalDriverSalary
            ),

          totalAdvance:
            round(
              totalAdvance
            ),

          totalExpense:
            round(
              totalExpense
            ),

          officeShouldPay:
            round(
              officeShouldPay
            ),

          driverShouldReturn:
            round(
              driverShouldReturn
            ),
        },

        trips:
          tripData,
      },
    });
  } catch (error) {
    console.error(
      "getDriverSettlement error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================================
   SETTLE DRIVER TRIPS
========================================================= */

exports.settleDriverTrips = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { driverId } = req.params;
    const { tripIds, remarks } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    if (!Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "tripIds must be a non-empty array",
      });
    }

    // --------------------------------------------------
    // 1. Find driver
    // --------------------------------------------------
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

    // --------------------------------------------------
    // 2. Find completed trips assigned to this driver
    // --------------------------------------------------
    const trips = await Trip.find({
      businessId,
      _id: { $in: tripIds },
      tripStatus: "Completed",
      journeyLegs: {
        $elemMatch: {
          $or: [
            { driver1: driverId },
            { driver2: driverId },
          ],
        },
      },
    }).populate("vehicleId", "regNo");

    if (trips.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No eligible completed trips found for this driver",
      });
    }

    // --------------------------------------------------
    // 3. Get TripExpense records
    // --------------------------------------------------
    const foundTripIds = trips.map((trip) => trip._id);

    const expenses = await TripExpense.find({
      businessId,
      tripId: { $in: foundTripIds },
      driverId,
    }).lean();

    // --------------------------------------------------
    // 4. Existing driver settlements
    // --------------------------------------------------
    if (!driver.settlement) {
      driver.settlement = {
        trips: [],
      };
    }

    if (!Array.isArray(driver.settlement.trips)) {
      driver.settlement.trips = [];
    }

    const alreadySettledTripIds = new Set(
      driver.settlement.trips
        .filter((item) => item.status === "Settled")
        .map((item) => item.tripId?.toString())
    );

    // --------------------------------------------------
    // 5. Prepare settlement entries
    // --------------------------------------------------
    const settlementEntries = [];

    const round = (value) =>
      Number(Number(value || 0).toFixed(2));

    for (const trip of trips) {
      const tripIdString = trip._id.toString();

      // Prevent duplicate settlement
      if (alreadySettledTripIds.has(tripIdString)) {
        continue;
      }

      // --------------------------------------------------
      // Driver's legs only
      // --------------------------------------------------
      const driverLegs = (trip.journeyLegs || []).filter(
        (leg) =>
          leg.driver1?.toString() === driverId.toString() ||
          leg.driver2?.toString() === driverId.toString()
      );

      if (driverLegs.length === 0) {
        continue;
      }

      const driverLegNos = driverLegs.map((leg) =>
        Number(leg.legNo)
      );

      // --------------------------------------------------
      // Driver expenses for these legs
      // --------------------------------------------------
      const driverTripExpenses = expenses.filter((expense) => {
        return (
          expense.tripId.toString() === tripIdString &&
          expense.driverId?.toString() === driverId.toString() &&
          driverLegNos.includes(Number(expense.legNo))
        );
      });

      // --------------------------------------------------
      // Expense calculations
      // --------------------------------------------------
      const loading = driverTripExpenses
        .filter((e) => e.expenseType === "Loading")
        .reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

      const unloading = driverTripExpenses
        .filter((e) => e.expenseType === "Unloading")
        .reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

      const parking = driverTripExpenses
        .filter((e) => e.expenseType === "Parking")
        .reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

      const repair = driverTripExpenses
        .filter((e) => e.expenseType === "Repair")
        .reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

      const miscellaneous = driverTripExpenses
        .filter((e) => e.expenseType === "Miscellaneous")
        .reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );

      // --------------------------------------------------
      // PC
      // --------------------------------------------------
      const PC = driverLegs.reduce(
        (sum, leg) =>
          sum + Number(leg.PC?.amount || 0),
        0
      );

      // --------------------------------------------------
      // Fuel
      // --------------------------------------------------
      const fuel = round(trip.totalFuelCost || 0);

      // --------------------------------------------------
      // Weighbridge
      // --------------------------------------------------
      const weighbridge = driverLegs.reduce(
        (sum, leg) =>
          sum +
          Number(
            leg.weighbridge?.weighbridgeFee || 0
          ),
        0
      );

      // --------------------------------------------------
      // Driver Advance
      // --------------------------------------------------
      const totalAdvance = driverLegs.reduce(
        (sum, leg) =>
          sum +
          (leg.driverAdvance || []).reduce(
            (advanceSum, entry) =>
              advanceSum + Number(entry.amount || 0),
            0
          ),
        0
      );

      // --------------------------------------------------
      // Driver Salary
      // --------------------------------------------------
      const totalDriverSalary = driverLegs.reduce(
        (sum, leg) =>
          sum + Number(leg.driverSalary || 0),
        0
      );

      // --------------------------------------------------
      // Actual Expense
      // --------------------------------------------------
      const actualExpense = round(
        fuel +
          loading +
          unloading +
          parking +
          repair +
          miscellaneous +
          PC +
          weighbridge
      );

      // --------------------------------------------------
      // Office / Driver settlement calculation
      // --------------------------------------------------
      let officeShouldPay = 0;
      let driverShouldReturn = 0;

      if (actualExpense > totalAdvance) {
        officeShouldPay = round(
          actualExpense - totalAdvance
        );
      } else {
        driverShouldReturn = round(
          totalAdvance - actualExpense
        );
      }

      // --------------------------------------------------
      // Leg-wise settlement details
      // --------------------------------------------------
      const settlementLegs = driverLegs.map((leg) => {
        const legExpenses = driverTripExpenses.filter(
          (expense) =>
            Number(expense.legNo) === Number(leg.legNo)
        );

        const legLoading = legExpenses
          .filter((e) => e.expenseType === "Loading")
          .reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

        const legUnloading = legExpenses
          .filter((e) => e.expenseType === "Unloading")
          .reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

        const legParking = legExpenses
          .filter((e) => e.expenseType === "Parking")
          .reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

        const legRepair = legExpenses
          .filter((e) => e.expenseType === "Repair")
          .reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

        const legMiscellaneous = legExpenses
          .filter(
            (e) => e.expenseType === "Miscellaneous"
          )
          .reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

        const legPC = Number(
          leg.PC?.amount || 0
        );

        const legWeighbridge = Number(
          leg.weighbridge?.weighbridgeFee || 0
        );

        const legAdvance = (
          leg.driverAdvance || []
        ).reduce(
          (sum, entry) =>
            sum + Number(entry.amount || 0),
          0
        );

        const legExpense = round(
          legLoading +
            legUnloading +
            legParking +
            legRepair +
            legMiscellaneous +
            legPC +
            legWeighbridge
        );

        let legOfficePay = 0;
        let legDriverReturn = 0;

        if (legExpense > legAdvance) {
          legOfficePay = round(
            legExpense - legAdvance
          );
        } else {
          legDriverReturn = round(
            legAdvance - legExpense
          );
        }

        return {
          legNo: Number(leg.legNo),

          from: leg.from || "",
          to: leg.to || "",

          driver1: leg.driver1 || null,
          driver2: leg.driver2 || null,

          driverSalary: round(
            leg.driverSalary || 0
          ),

          freightAmount: round(
            leg.estimatedFreightAmount || 0
          ),

          driverAdvance: round(legAdvance),

          PC: round(legPC),

          weighbridge: round(
            legWeighbridge
          ),

          loading: round(legLoading),
          unloading: round(legUnloading),
          parking: round(legParking),
          repair: round(legRepair),
          miscellaneous: round(
            legMiscellaneous
          ),

          actualExpense: round(legExpense),

          officePay: round(legOfficePay),

          driverReturn: round(
            legDriverReturn
          ),
        };
      });

      // --------------------------------------------------
      // Trip settlement entry
      // --------------------------------------------------
      settlementEntries.push({
        tripId: trip._id,

        tripNo: trip.tripNo,

        vehicleId: trip.vehicleId?._id || null,

        vehicleNo:
          trip.vehicleId?.regNo || "-",

        journeyType: trip.journeyType,

        legs: settlementLegs,

        totalDriverSalary: round(
          totalDriverSalary
        ),

        totalAdvance: round(
          totalAdvance
        ),

        totalExpense: round(
          actualExpense
        ),

        officeShouldPay: round(
          officeShouldPay
        ),

        driverShouldReturn: round(
          driverShouldReturn
        ),

        status: "Settled",

        settledAmount: round(
          officeShouldPay
        ),

        settledAt: new Date(),

        remarks: remarks || "",
      });
    }

    // --------------------------------------------------
    // 6. No new settlements
    // --------------------------------------------------
    if (settlementEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "All selected trips are already settled for this driver",
      });
    }

    // --------------------------------------------------
    // 7. Push settlement entries into Driver
    // --------------------------------------------------
    driver.settlement.trips.push(
      ...settlementEntries
    );

    await driver.save();

    // --------------------------------------------------
    // 8. Response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Driver settlement completed",
      data: {
        driverId: driver._id,
        driverCode: driver.driverId,
        settledTrips:
          settlementEntries.length,
        settlements: settlementEntries,
      },
    });
  } catch (error) {
    console.error(
      "settleDriverTrips error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};