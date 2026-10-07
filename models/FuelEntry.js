const mongoose = require("mongoose");

const fuelEntrySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    legNo: {
      type: Number,
      required: true,
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    fuelStation: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    fuelType: {
      type: String,
      enum: ["Diesel", "Petrol", "CNG", "LNG", "EV"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "FASTag", "Credit", "UPI"],
    },

    billNo: {
      type: String,
      trim: true,
    },

    // Optional
    billPath: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FuelEntry", fuelEntrySchema);
