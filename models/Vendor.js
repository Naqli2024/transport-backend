const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // =================================
    // VENDOR ID
    // =================================

    vendorCode: {
      type: String,
      required: true,
    },

    // =================================
    // BASIC INFORMATION
    // =================================

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

    // =================================
    // VENDOR SETTLEMENT
    // =================================

    settlement: {
      // ---------------------------------
      // DRIVER-STYLE VENDOR LEVEL TOTALS
      // ---------------------------------

      totalPayable: {
        type: Number,
        default: 0,
        min: 0,
      },

      settledAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      balanceAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      status: {
        type: String,
        enum: ["Pending", "Partial", "Settled"],
        default: "Pending",
      },

      lastSettledAt: {
        type: Date,
      },

      remarks: {
        type: String,
        trim: true,
      },

      // ---------------------------------
      // TRIP CALCULATION / DISPLAY HISTORY
      // ---------------------------------
      //
      // These trips are NOT individually settled.
      //
      // They are only used to show:
      // - Which completed trips generated
      //   the vendor payable
      // - Vendor amount for each trip
      //
      // Actual settlement remains vendor-level.
      //

      trips: [
        {
          tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
          },

          tripNo: {
            type: String,
          },

          vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
          },

          vehicleNo: {
            type: String,
          },

          vehicleCategory: {
            type: String,
          },

          vendorVehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VendorVehicle",
          },

          journeyType: {
            type: String,
          },

          // Amount payable to vendor
          vendorAmount: {
            type: Number,
            default: 0,
            min: 0,
          },
        },
      ],
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
