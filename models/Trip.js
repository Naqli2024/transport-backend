const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    tripNo: {
      type: String,
      unique: true,
    },

    fleetSource: {
      type: String,
      enum: ["Own Fleet", "Vendor"],
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    vendorVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorVehicle",
    },

    journeyType: {
      type: String,
      enum: ["One Way", "Round Trip", "Multi Leg", "Relay", "Dedicated"],
    },

    vehicleCategory: String,

    commodity: String,

    weight: Number,

    uom: String,

    freightAmount: Number,

    advanceAmount: Number,

    loadType: {
      type: String,
      enum: ["FTL", "PTL"],
    },

    paymentType: {
      type: String,
      enum: ["Account", "Cash"],
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Broker",
    },

    origin: {
      location: String,
    },

    destination: {
      location: String,
    },

    journeyLegs: [
      {
        legNo: Number,

        from: String,

        to: String,

        customerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Customer",
        },

        brokerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Broker",
        },

        status: {
          type: String,
          enum: ["Pending", "In Progress", "Arrived", "Completed"],
          default: "Pending",
        },
      },
    ],

    currentLeg: {
      type: Number,
      default: 1,
    },

    lrNo: String,

    driver1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    driver2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    cleanerName: String,

    cleanerPhone: String,

    driverAdvance: {
      type: Number,
      default: 0,
    },

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
        "Closed",
      ],
      default: "Pre Trip Pending",
    },
    pickupReachedAt: Date,
    startTime: Date,
    startOdometer: Number,
    endTime: Date,
    loading: {
      loadingStartTime: Date,
      loadingEndTime: Date,
      loadedWeight: Number,
      loadedBy: String,
      remarks: String,
      status: {
        type: String,
        enum: ["Pending", "Loading", "Completed"],
        default: "Pending",
      },
    },
    unloading: {
      unloadingStartTime: Date,

      unloadingEndTime: Date,

      unloadedWeight: Number,

      unloadedBy: String,

      podNumber: String,

      remarks: String,

      status: {
        type: String,
        enum: ["Pending", "Unloading", "Completed"],
        default: "Pending",
      },
    },
    deliveryOtp: {
      type: String,
    },

    deliveryOtpExpiry: {
      type: Date,
    },

    deliveryOtpVerified: {
      type: Boolean,
      default: false,
    },

    pod: {
      status: {
        type: String,
        enum: ["Pending", "Uploaded"],
        default: "Pending",
      },

      podPath: String,

      invoicePath: String,

      deliveryChallanPath: String,

      uploadedAt: Date,

      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },

      remarks: String,
    },
    arrivalTime: Date,

    arrivalOdometer: Number,

    arrivalRemarks: String,

    weighbridge: {
      status: {
        type: String,
        enum: ["Pending", "Completed"],
        default: "Pending",
      },

      grossWeight: {
        type: Number,
      },

      uom: String,

      ticketNumber: {
        type: String,
      },

      weighbridgeName: {
        type: String,
      },

      weighbridgeFee: {
        type: Number,
      },

      receiptPath: {
        type: String,
      },

      remarks: {
        type: String,
      },

      measuredAt: {
        type: Date,
      },

      measuredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    },

    tripExpense: {
      expenseType: {
        type: String,
        enum: ["Loading", "Unloading", "Parking", "Repair", "Miscellaneous"],
      },
      amount: String,
    },

    totalFuelCost: {
      type: Number,
      default: 0,
    },
    totalFuelQuantity: {
      type: Number,
      default: 0,
    },

    totalFuelEntries: {
      type: Number,
      default: 0,
    },
    totalExpense: {
      type: Number,
      default: 0,
    },
    totalExpenseEntries: {
      type: Number,
      default: 0,
    },

    profit: {
      type: Number,
      default: 0,
    },
    distanceTravelled: {
      type: Number,
      default: 0,
    },
    totalFuelQuantity: {
      type: Number,
      default: 0,
    },
    completedAt: Date,

    closedAt: Date,
  },
  {
    timestamps: true,
  },
);

tripSchema.pre("save", async function () {
  if (this.tripNo) return;

  const Trip = mongoose.model("Trip");

  const count = await Trip.countDocuments();

  this.tripNo = `TRP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
});

module.exports = mongoose.model("Trip", tripSchema);
