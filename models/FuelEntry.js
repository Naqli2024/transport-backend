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

    odometer: Number,

    fuelStation: String,

    location: String,

    fuelType: {
      type: String,
      enum: ["Diesel", "Petrol", "CNG", "LNG", "EV"],
    },

    quantity: Number,

    rate: Number,

    amount: Number,

    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "FASTag", "Credit", "UPI"],
    },

    billNo: String,

    billPath: String,

    remarks: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FuelEntry", fuelEntrySchema);
