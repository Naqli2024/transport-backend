const mongoose = require("mongoose");

const fuelSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    fuelId: String,

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    regNo: String,

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    driverName: String,

    fuelDate: Date,

    litres: Number,

    amount: Number,

    pricePerLitre: Number,

    odometer: Number,

    pumpName: String,

    billImage: String,

    extractedText: String,

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    suspicious: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Fuel", fuelSchema);
