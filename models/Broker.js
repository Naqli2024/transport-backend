const mongoose = require("mongoose");

const brokerSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    brokerId: {
      type: String,
      unique: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: String,

    mobile: {
      type: Number,
      required: true,
    },

    email: String,

    gstNo: String,

    address: String,

    city: String,

    state: String,

    country: String,

    pincode: String,

    commissionType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      default: "Percentage",
    },

    commissionValue: {
      type: Number,
      default: 0,
    },

    paymentTerms: {
      type: String,
      default: "30 Days",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    totalTrips: {
      type: Number,
      default: 0,
    },

    totalCommission: {
      type: Number,
      default: 0,
    },

    outstandingAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

brokerSchema.pre("save", async function () {
  if (this.brokerId) return;

  const Broker = mongoose.model("Broker");

  const lastBroker = await Broker.findOne().sort({
    createdAt: -1,
  });

  let next = 1;

  if (lastBroker) {
    next = parseInt(lastBroker.brokerId.split("-")[1]) + 1;
  }

  this.brokerId = `BRK-${String(next).padStart(3, "0")}`;
});

module.exports = mongoose.model("Broker", brokerSchema);
