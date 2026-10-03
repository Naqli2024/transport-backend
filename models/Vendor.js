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
      required: true,
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
  },
);

/*
  Multitenant unique index

  Same vendorCode can exist in different businesses,
  but cannot be duplicated inside the same business.
*/
vendorSchema.index(
  {
    businessId: 1,
    vendorCode: 1,
  },
  {
    unique: true,
  },
);

/*
  Generate vendorCode before validation
*/
vendorSchema.pre("validate", async function () {
  if (this.vendorCode) return;

  const Vendor = mongoose.model("Vendor");

  const lastVendor = await Vendor.findOne({
    businessId: this.businessId,
  }).sort({
    createdAt: -1,
  });

  let nextNumber = 1;

  if (lastVendor?.vendorCode) {
    const lastNumber = parseInt(lastVendor.vendorCode.replace("VEN", ""), 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  this.vendorCode = `VEN${String(nextNumber).padStart(5, "0")}`;
});

module.exports = mongoose.model("Vendor", vendorSchema);
