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

    // Identifies which journey leg this inspection belongs to
    legNo: {
      type: Number,
      required: true,
      min: 1,
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
            "FL",
            "FR",
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
  }
);

// Only one pre-trip inspection per journey leg
preTripInspectionSchema.index(
  { businessId: 1, tripId: 1, legNo: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PreTripInspection",
  preTripInspectionSchema
);
