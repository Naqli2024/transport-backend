const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    regNo: {
      type: String,
      required: true,
    },
    fleet: {
      type: String,
      required: true,
      enum: [
        "vehicle",
        "equipment",
        "tyre",
      ],
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Truck",
        "Trailer",
        "LCV",
        "Container",
        "Tanker",
        "Mini Truck",
        /**Equipment Types***/
        "Backhoe",
        "Excavator",
        "Mini",
        "Vibratory",
        "Crane",
        "Telehandler",
        "Grader",
        "Concrete",
        "Transit",
      ],
    },
    make: String,
    model:  String,
    year: Number,
    engineNo: String,
    chassisNo: String,
    axle: String,
    gvw: Number,
    currentKm: {
      type: Number,
      default: 0,
    },
    healthStatus: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Critical"],
      default: "Good",
    },
    ownerShip: String,
    insuranceExpiryDate: String,
    rcBookExpiryDate: String,
    fcExpiryDate: String,
    taxExpiryDate: String,
    permitExpiryDate: String,
    pollutionExpiryDate: String,
    permitType: String,
    purchaseCost: Number,
    tollTagAvailable: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [        
        "Active",
        "In Transit",
        "Maintenance",
        "Breakdown",
        "On Trip",
        "Inactive",
    ],
      default: "Active"
    },
    /**Equipment***/
    serialNo: String,
    currentEngineHrs: Number,
    hourlyRate: Number,
    minShiftHrs: Number,
    siteName: String,
    clientName: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
