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

    battery: Boolean,

    lights: Boolean,

    horn: Boolean,

    windshield: Boolean,

    documents: Boolean,

    bodyDamage: Boolean,

    remarks: String,

    photos: [String],

    tyres: [
      {
        position: String,

        treadDepthMM: Number,

        treadLossMM: Number,

        airPressureOK: Boolean,

        sideWallDamage: Boolean,

        puncture: Boolean,

        unevenWear: Boolean,

        condition: {
          type: String,
          enum: ["Excellent", "Good", "Average", "Poor"],
        },
      },
    ],

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
