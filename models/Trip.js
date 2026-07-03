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
      ref: "Customer"
    },

    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Broker",
    },

    origin: {
      location: String,
      city: String,
      state: String,
      latitude: Number,
      longitude: Number,
    },

    destination: {
      location: String,
      city: String,
      state: String,
      latitude: Number,
      longitude: Number,
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

    dieselAmount: {
      type: Number,
      default: 0,
    },

    tollAmount: {
      type: Number,
      default: 0,
    },

    loadingAmount: {
      type: Number,
      default: 0,
    },

    unloadingAmount: {
      type: Number,
      default: 0,
    },

    commissionAmount: {
      type: Number,
      default: 0,
    },

    miscAmount: {
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
        "Ready To Start",
        "In Transit",
        "Unloading",
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
    arrivalTime: Date,

    arrivalOdometer: Number,

    arrivalRemarks: String,
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
