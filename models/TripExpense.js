const mongoose = require("mongoose");

const tripExpenseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
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
      default: 0,
    },

    filePath: {
      type: String,
      required: true,
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