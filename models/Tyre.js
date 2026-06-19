const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema({
  inspectionDate: {
    type: Date,
    default: Date.now,
  },

  treadDepth: Number,

  currentKm: Number,

  pressure: Number,

  remarks: String,
});

const tyreSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    tyreCode: {
      type: String,
      required: true,
    },

    tin: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    brand: String,

    model: String,

    size: String,

    purchaseCost: Number,

    purchaseDate: Date,

    status: {
      type: String,
      enum: [
        "In Stock",
        "Installed",
        "Needs Replacement",
        "Removed",
        "Retread",
        "Scrapped",
        "Replaced"
      ],
      default: "In Stock",
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    position: {
      type: String,
      enum: ["FL", "FR", "RL1", "RR1", "RL2", "RR2", "Spare"],
    },

    installedDate: Date,

    currentKm: {
      type: Number,
      default: 0,
    },

    treadDepth: Number,

    estimatedKmLeft: {
      type: Number,
      default: 0,
    },

    replacementHistory: [
      {
        oldTyreId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tyre",
        },

        newTyreId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tyre",
        },

        replacedDate: {
          type: Date,
          default: Date.now,
        },

        reason: String,
      },
    ],

    riskLevel: {
      type: String,
      enum: ["Healthy", "Warning", "Critical"],
      default: "Healthy",
    },

    inspections: [inspectionSchema],
  },
  { timestamps: true },
);

tyreSchema.index({
  businessId: 1,
  tyreCode: 1,
});

tyreSchema.index({
  businessId: 1,
  status: 1,
});

module.exports = mongoose.model("Tyre", tyreSchema);
