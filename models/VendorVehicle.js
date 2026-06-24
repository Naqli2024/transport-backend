const mongoose = require("mongoose");

const vendorVehicleSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
      },

      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
      },

      regNo: {
        type: String,
        required: true,
        uppercase: true,
      },

      vehicleType: {
        type: String,
      },

      make: String,

      model: String,

      capacity: Number,

      driverName: String,

      driverMobile: String,

      status: {
        type: String,
        enum: [
          "Available",
          "On Trip",
          "Inactive",
        ],
        default: "Available",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "VendorVehicle",
    vendorVehicleSchema
  );