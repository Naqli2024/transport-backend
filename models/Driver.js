const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // =================================
    // DRIVER ID
    // =================================
    driverId: {
      type: String,
      required: false,
    },

    // =================================
    // LOGIN
    // =================================
    userName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // =================================
    // BASIC INFO
    // =================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: Number,
      required: true,
    },

    aadhaarNo: Number,

    experience: {
      type: Number,
      default: 0,
    },

    // =================================
    // LICENSE INFO
    // =================================
    dlNo: {
      type: String,
      required: true,
      uppercase: true,
    },

    dlClass: {
      type: String,
      enum: ["LMV", "HMV", "Transport", "Heavy"],
    },

    licenseExpiryDate: String,

    // =================================
    // VEHICLE
    // =================================
    vehicle: {
      status: {
        type: String,
        enum: ["Assigned", "Unassigned"],
        default: "Unassigned",
      },

      vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },

      regNo: String,

      assignedDate: Date,
    },

    // =================================
    // DRIVER STATUS
    // =================================
    availableStatus: {
      type: String,
      enum: [
        "Available",
        "Reserved",
        "On Trip",
        "On Leave",
        "Resting",
        "Sick Leave",
        "Inactive",
      ],
      default: "Available",
    },

    score: {
      type: Number,
      default: 0,
    },

    currentTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    totalTrips: {
      type: Number,
      default: 0,
    },

    lat: Number,

    lng: Number,

    // =================================
    // DRIVER SETTLEMENT
    // =================================

    settlement: {
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

          journeyType: {
            type: String,
          },

          legs: [
            {
              legNo: {
                type: Number,
                required: true,
              },

              from: {
                type: String,
              },

              to: {
                type: String,
              },

              driver1: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Driver",
              },

              driver2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Driver",
              },

              driverSalary: {
                type: Number,
                default: 0,
                min: 0,
              },

              freightAmount: {
                type: Number,
                default: 0,
                min: 0,
              },

              driverAdvance: {
                type: Number,
                default: 0,
                min: 0,
              },

              PC: {
                type: Number,
                default: 0,
                min: 0,
              },

              weighbridge: {
                type: Number,
                default: 0,
                min: 0,
              },

              fuel: {
                type: Number,
                default: 0,
                min: 0,
              },

              loading: {
                type: Number,
                default: 0,
                min: 0,
              },

              unloading: {
                type: Number,
                default: 0,
                min: 0,
              },

              parking: {
                type: Number,
                default: 0,
                min: 0,
              },

              repair: {
                type: Number,
                default: 0,
                min: 0,
              },

              miscellaneous: {
                type: Number,
                default: 0,
                min: 0,
              },

              actualExpense: {
                type: Number,
                default: 0,
                min: 0,
              },

              officePay: {
                type: Number,
                default: 0,
                min: 0,
              },

              driverReturn: {
                type: Number,
                default: 0,
                min: 0,
              },
            },
          ],

          totalDriverSalary: {
            type: Number,
            default: 0,
            min: 0,
          },

          totalAdvance: {
            type: Number,
            default: 0,
            min: 0,
          },

          totalExpense: {
            type: Number,
            default: 0,
            min: 0,
          },

          officeShouldPay: {
            type: Number,
            default: 0,
            min: 0,
          },

          driverShouldReturn: {
            type: Number,
            default: 0,
            min: 0,
          },

          status: {
            type: String,
            enum: ["Pending", "Partial", "Settled"],
            default: "Pending",
          },

          settledAmount: {
            type: Number,
            default: 0,
            min: 0,
          },

          settledAt: {
            type: Date,
          },

          remarks: {
            type: String,
            trim: true,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

/* =================================
   UNIQUE USERNAME PER BUSINESS
================================= */

driverSchema.index({ businessId: 1, userName: 1 }, { unique: true });

/* =================================
   UNIQUE DRIVER ID PER BUSINESS
================================= */

driverSchema.index({ businessId: 1, driverId: 1 }, { unique: true });

/* =================================
   AUTO GENERATE DRIVER ID
   PER BUSINESS

   Business A:
   DRV-001
   DRV-002

   Business B:
   DRV-001
   DRV-002
================================= */

driverSchema.pre("save", async function () {
  if (this.driverId) {
    return;
  }

  const Driver = mongoose.model("Driver");

  const lastDriver = await Driver.findOne({
    businessId: this.businessId,
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastDriver && lastDriver.driverId) {
    const lastNumber = parseInt(lastDriver.driverId.split("-")[1], 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  this.driverId = `DRV-${String(nextNumber).padStart(3, "0")}`;
});

module.exports = mongoose.model("Driver", driverSchema);
