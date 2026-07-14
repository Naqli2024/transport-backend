const mongoose = require("mongoose");

const podSchema = new mongoose.Schema(
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

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    receiverName: {
      type: String,
      required: true,
    },

    receiverMobile: {
      type: String,
      required: true,
    },

    podNumber: {
      type: String,
      required: true,
    },

    podPath: {
      type: String,
      required: true,
    },

    invoicePath: String,

    deliveryChallanPath: String,

    remarks: String,

    status: {
      type: String,
      enum: [
        "Pending",
        "Uploaded",
        "Verified",
        "Rejected",
      ],
      default: "Uploaded",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Pod", podSchema);