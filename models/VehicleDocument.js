const mongoose = require("mongoose");

const vehicleDocumentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      enum: [
        "RC_BOOK",
        "INSURANCE",
        "FITNESS_CERTIFICATE",
        "ROAD_TAX",
        "PERMIT",
        "POLLUTION",
        "FASTAG",
        "NATIONAL_PERMIT",
        "STATE_PERMIT",
        "OTHER",
      ],
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("VehicleDocument", vehicleDocumentSchema);
