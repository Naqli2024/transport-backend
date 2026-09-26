const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    // =========================================================
    // BUSINESS
    // =========================================================

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    tripNo: {
      type: String,
    },

    // =========================================================
    // VEHICLE / FLEET
    // =========================================================

    fleetSource: {
      type: String,
      enum: ["Own Fleet", "Vendor"],
      required: true,
    },

    // Own Fleet
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    vehicleCategory: {
      type: String
    },

    // Vendor
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    vendorVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorVehicle",
    },

    // =========================================================
    // JOURNEY
    // =========================================================

    journeyType: {
      type: String,
      enum: ["One Way", "Round Trip", "Multi Leg", "Relay", "Dedicated"],
      required: true,
    },

    // Current active leg number
    // Example:
    // currentLeg: 1 => journeyLegs[0]
    // currentLeg: 2 => journeyLegs[1]
    currentLeg: {
      type: Number,
      default: 1,
      min: 1,
    },

    // =========================================================
    // OVERALL TRIP STATUS
    // =========================================================

    tripStatus: {
      type: String,
      enum: [
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
        "Completed",
        "Closed"
      ],
      default: "Pre Trip Pending",
    },

    // =========================================================
    // JOURNEY LEGS
    // =========================================================

    journeyLegs: [
      {
        // -----------------------------------------------------
        // LEG IDENTIFICATION
        // -----------------------------------------------------

        legNo: {
          type: Number,
          required: true,
        },

        // -----------------------------------------------------
        // ROUTE
        // -----------------------------------------------------

        from: {
          type: String,
          required: true,
          trim: true,
        },

        to: {
          type: String,
          required: true,
          trim: true,
        },

        // -----------------------------------------------------
        // CUSTOMER / BROKER
        // -----------------------------------------------------

        customerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Customer",
        },

        brokerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Broker",
        },

        // -----------------------------------------------------
        // CONSIGNMENT
        // -----------------------------------------------------

        commodity: {
          type: String,
          trim: true,
        },

        weight: {
          type: Number,
          min: 0,
        },

        uom: {
          type: String,
          trim: true,
        },

        amountPerTon: {
          type: Number,
          min: 0,
        },

        estimatedFreightAmount: {
          type: Number,
          min: 0,
        },

        loadType: {
          type: String,
          trim: true,
        },

        paymentType: {
          type: String,
          trim: true,
        },

        // -----------------------------------------------------
        // DRIVER
        // -----------------------------------------------------

        driver1: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Driver",
        },

        driver2: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Driver",
        },

        driverSalary: {
          type: Number,
          min: 0,
        },

        // -----------------------------------------------------
        // DRIVER ADVANCE HISTORY
        // -----------------------------------------------------

        driverAdvance: [
          {
            date: {
              type: Date,
              required: true,
            },

            amount: {
              type: Number,
              required: true,
              min: 0,
            },
          },
        ],

        // -----------------------------------------------------
        // LEG STATUS
        // -----------------------------------------------------

        legStatus: {
          type: String,
          enum: [
            "Pre Trip Pending",
            "Inspection Pending",
            "Ready For Loading",
            "Reached Pickup",
            "Loading",
            "Documents Pending",
            "Ready To Start",
            "In Transit",
            "Unloading",
            "Completed",
          ],
          default: "Pre Trip Pending",
        },

        // =====================================================
        // PICKUP
        // =====================================================

        pickupReachedAt: {
          type: Date,
        },

        // =====================================================
        // LOADING
        // =====================================================

        loading: {
          loadingStartTime: {
            type: Date,
          },

          loadingEndTime: {
            type: Date,
          },

          loadedWeight: {
            type: Number,
            min: 0,
          },

          loadedBy: {
            type: String,
            trim: true,
          },

          remarks: {
            type: String,
            trim: true,
          },

          status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
          },
        },

        // =====================================================
        // JOURNEY START
        // =====================================================

        startTime: {
          type: Date,
        },

        // startOdometer: {
        //   type: Number,
        //   min: 0,
        // },

        // =====================================================
        // ARRIVAL
        // =====================================================

        arrivalTime: {
          type: Date,
        },

        arrivalOdometer: {
          type: Number,
          min: 0,
        },

        arrivalRemarks: {
          type: String,
          trim: true,
        },

        endTime: {
          type: Date,
        },

        // =====================================================
        // UNLOADING
        // =====================================================

        unloading: {
          unloadingStartTime: {
            type: Date,
          },

          unloadingEndTime: {
            type: Date,
          },

          unloadedWeight: {
            type: Number,
            min: 0,
          },

          unloadedBy: {
            type: String,
            trim: true,
          },

          remarks: {
            type: String,
            trim: true,
          },

          status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
          },
        },

        // =====================================================
        // POD
        // =====================================================

        pod: {
          podUrl: {
            type: String,
            trim: true,
          },

          uploadedAt: {
            type: Date,
          },

          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },

          remarks: {
            type: String,
            trim: true,
          },
        },

        // =====================================================
        // WEIGHBRIDGE
        // =====================================================

        weighbridge: {
          status: {
            type: String,
            enum: ["Pending", "Completed"],
            default: "Pending",
          },

          grossWeight: {
            type: Number,
            min: 0,
          },

          uom: {
            type: String,
            trim: true,
          },

          ticketNumber: {
            type: String,
            trim: true,
          },

          weighbridgeName: {
            type: String,
            trim: true,
          },

          weighbridgeFee: {
            type: Number,
            min: 0,
          },

          receiptPath: {
            type: String,
            trim: true,
          },

          remarks: {
            type: String,
            trim: true,
          },

          measuredAt: {
            type: Date,
          },

          measuredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
          },
        },

        // =====================================================
        // LEG EXPENSE
        // =====================================================

        tripExpense: [
          {
            expenseType: {
              type: String,
              trim: true,
            },

            amount: {
              type: Number,
              min: 0,
            },

            date: {
              type: Date,
            },

            remarks: {
              type: String,
              trim: true,
            },
          },
        ],

        // =====================================================
        // LEG DISTANCE
        // =====================================================

        distanceTravelled: {
          type: Number,
          min: 0,
        },

        // =====================================================
        // LEG COMPLETION
        // =====================================================

        completedAt: {
          type: Date,
        },
      },
    ],

    // =========================================================
    // TRIP LEVEL TOTALS
    // =========================================================

    totalFuelCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalFuelQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalFuelEntries: [
      {
        date: {
          type: Date,
        },

        quantity: {
          type: Number,
          min: 0,
        },

        amount: {
          type: Number,
          min: 0,
        },

        odometer: {
          type: Number,
          min: 0,
        },

        remarks: {
          type: String,
          trim: true,
        },
      },
    ],

    totalExpense: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalExpenseEntries: [
      {
        expenseType: {
          type: String,
          trim: true,
        },

        amount: {
          type: Number,
          min: 0,
        },

        date: {
          type: Date,
        },

        remarks: {
          type: String,
          trim: true,
        },
      },
    ],

    // =========================================================
    // OVERALL TRIP FINANCIALS
    // =========================================================

    profit: {
      type: Number,
      default: 0,
    },

    // Overall trip distance
    distanceTravelled: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================================
    // TRIP DATES
    // =========================================================

    completedAt: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },

    // =========================================================
    // SETTLEMENT
    // =========================================================

    settlement: {
      status: {
        type: String,
        enum: ["Pending", "Partial", "Settled"],
        default: "Pending",
      },

      settledAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      settledAt: {
        type: Date,
      },

      remarks: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

// =============================================================
// INDEXES
// =============================================================

// Trip number unique only within a business.
// Sequence continues across years.
tripSchema.index(
  {
    businessId: 1,
    tripNo: 1,
  },
  {
    unique: true,
  },
);

// Useful for business trip listing/search
tripSchema.index({
  businessId: 1,
  createdAt: -1,
});

// Useful for active trip queries
tripSchema.index({
  businessId: 1,
  tripStatus: 1,
});

// =============================================================
// AUTO GENERATE TRIP NUMBER
// =============================================================

tripSchema.pre("save", async function () {
  if (this.tripNo) {
    return;
  }

  const Trip = mongoose.model("Trip");

  const lastTrip = await Trip.findOne({
    businessId: this.businessId,
  })
    .sort({
      createdAt: -1,
    })
    .select("tripNo");

  let nextNumber = 1;

  if (lastTrip && lastTrip.tripNo) {
    const lastNumber = parseInt(lastTrip.tripNo.split("-").pop(), 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  this.tripNo = `TRP-${new Date().getFullYear()}-${String(nextNumber).padStart(
    4,
    "0",
  )}`;
});

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;
