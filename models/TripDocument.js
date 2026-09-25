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

    legNo: {
      type: Number,
      required: true,
      min: 1,
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

tripDocumentSchema.index(
  {
    businessId: 1,
    tripId: 1,
    legNo: 1,
    documentType: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("TripDocument", tripDocumentSchema);