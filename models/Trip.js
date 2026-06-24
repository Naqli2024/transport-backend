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

    customerName: String,

    brokerName: String,

    lrNo: String,

    driver1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
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
        "Ready To Start",
        "In Transit",
        "Completed",
        "Closed",
      ],
      default: "Pre Trip Pending",
    },
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
