const mongoose = require("mongoose");

const tripExpenseSchema = new mongoose.Schema(
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

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    expenseType: {
      type: String,
      enum: [
        "Loading",
        "Unloading",
        "Parking",
        "Repair",
        "Miscellaneous",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    filePath: {
      type: String,
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TripExpense",
  tripExpenseSchema
);