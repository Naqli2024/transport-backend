const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    vendorCode: {
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
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    email: String,

    gstNo: String,

    city: String,

    state: String,

    address: String,

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

vendorSchema.pre("save", async function () {
  if (this.vendorCode) return;

  const Vendor = mongoose.model("Vendor");

  const lastVendor = await Vendor.findOne()
    .sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastVendor?.vendorCode) {
    nextNumber =
      parseInt(
        lastVendor.vendorCode.replace("VEN", "")
      ) + 1;
  }

  this.vendorCode =
    `VEN${String(nextNumber).padStart(5, "0")}`;
});

module.exports =
  mongoose.model("Vendor", vendorSchema);