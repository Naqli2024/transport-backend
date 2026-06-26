const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    customerId: {
      type: String,
      unique: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: Number,
      required: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    gstNo: {
      type: String,
      uppercase: true,
      trim: true,
    },

    billingAddress: {
      type: String,
      trim: true,
    },

    city: String,

    state: String,

    country: {
      type: String,
      default: "India",
    },

    pincode: String,

    creditLimit: {
      type: Number,
      default: 0,
    },

    paymentTerms: {
      type: String,
      enum: [
        "Advance",
        "Immediate",
        "7 Days",
        "15 Days",
        "30 Days",
        "45 Days",
        "60 Days",
      ],
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

    totalRevenue: {
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

/* =====================================
AUTO CUSTOMER ID
CUS-001
===================================== */

customerSchema.pre("save", async function () {
  if (this.customerId) return;

  const Customer = mongoose.model("Customer");

  const last = await Customer.findOne().sort({
    createdAt: -1,
  });

  let next = 1;

  if (last && last.customerId) {
    next = parseInt(last.customerId.split("-")[1]) + 1;
  }

  this.customerId = `CUS-${String(next).padStart(3, "0")}`;
});

module.exports = mongoose.model("Customer", customerSchema);
