const mongoose = require("mongoose");

const preTripInspectionSchema = new mongoose.Schema(
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
      required: true,
    },

    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    engineOil: Boolean,
    coolant: Boolean,
    brakes: Boolean,
    lights: Boolean,
    horn: Boolean,
    fuel: Boolean,
    documents: Boolean,
    fireExtinguisher: Boolean,
    firstAidKit: Boolean,

    remarks: String,

    tyres: [
      {
        position: {
          type: String,
          enum: [
            "FL", // Front Left
            "FR", // Front Right

            "RL1",
            "RL2",
            "RR1",
            "RR2",

            "TL1",
            "TL2",
            "TR1",
            "TR2",
          ],
        },

        treadDepthMM: Number,

        airPressureOK: Boolean,

        sideWallDamage: Boolean,

        puncture: Boolean,

        condition: {
          type: String,
          enum: ["Excellent", "Good", "Average", "Poor"],
        },
      },
    ],

    inspectionStatus: {
      type: String,
      enum: ["Pending", "Passed", "Failed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PreTripInspection", preTripInspectionSchema);
