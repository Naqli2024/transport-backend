const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    // DRIVER ID
    driverId: {
      type: String,
      unique: true,
    },

    // BASIC INFO
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

    // LICENSE INFO
    dlNo: {
      type: String,
      required: true,
      uppercase: true,
    },

    dlClass: {
      type: String,
      enum: [
        "LMV",
        "HMV",
        "Transport",
        "Heavy",
      ],
    },

    licenseExpiryDate: String,
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
    availableStatus: {
      type: String,
      enum: [
        "Available",
        "On Trip",
        "On Leave",
        "Resting",
        "Sick Leave",
        "Inactive",
        "Training",
        "Emergency",
      ],
      default: "Available",
    },
    score: {
      type: Number,
      default: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* =================================
   AUTO GENERATE DRIVER ID
   DRV-001
================================= */

driverSchema.pre("save", async function () {
  if (this.driverId) {
    return;
  }

  const Driver = mongoose.model("Driver");

  const lastDriver = await Driver.findOne()
    .sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastDriver && lastDriver.driverId) {

    const lastNumber = parseInt(
      lastDriver.driverId.split("-")[1]
    );

    nextNumber = lastNumber + 1;
  }

  this.driverId =
    `DRV-${String(nextNumber).padStart(3, "0")}`;
});

module.exports = mongoose.model("Driver", driverSchema);