const mongoose = require("mongoose");

const tripDocumentSchema = new mongoose.Schema(
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

    documentType: {
      type: String,
      enum: [
        "EWAY_BILL",
        "INVOICE",
        "DELIVERY_CHALLAN",
        "LR",
        "LOADING_PHOTO",
        "WEIGHBRIDGE",
        "POD",
        "POD_PHOTO",
        "OTHER",
      ],
      required: true,
    },

    documentNumber: String,

    filePath: {
      type: String,
      required: true,
    },

    remarks: String,

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TripDocument", tripDocumentSchema);