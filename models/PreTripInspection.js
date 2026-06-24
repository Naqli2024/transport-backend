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
    tyres: Boolean,
    lights: Boolean,
    horn: Boolean,
    fuel: Boolean,
    documents: Boolean,
    fireExtinguisher: Boolean,
    firstAidKit: Boolean,

    remarks: String,

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
