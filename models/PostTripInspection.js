const mongoose = require("mongoose");

const postTripInspectionSchema = new mongoose.Schema(
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

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    vendorVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorVehicle",
    },

    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    odometer: Number,

    fuelRemaining: Number,

    engineOil: Boolean,

    coolant: Boolean,

    brakes: Boolean,

    tyres: Boolean,

    battery: Boolean,

    lights: Boolean,

    horn: Boolean,

    windshield: Boolean,

    documents: Boolean,

    bodyDamage: Boolean,

    remarks: String,

    photos: [String],

    inspectionStatus: {
      type: String,
      enum: ["Passed", "Failed"],
      default: "Passed",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PostTripInspection", postTripInspectionSchema);
