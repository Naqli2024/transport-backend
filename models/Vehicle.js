const mongoose = require("mongoose");

const loggedHrsSchema = new mongoose.Schema(
  {
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    operatorName: String,
    startEngineHours: Number,
    endEngineHours: Number,
    workHours: Number,
    idleHours: Number,
    fuelFilledLiters: Number,
    workDone: String,
    status: {
      type: String,
      enum: ["Ongoing", "Completed"],
      default: "Ongoing",
    },
  },
  { _id: true }
);

/* =====================================
   BUS COMPLIANCE
===================================== */

const complianceSchema = new mongoose.Schema(
  {
    docType: String,
    docNo: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: [
        "Valid",
        "Due Soon",
        "Critical",
        "Expired",
      ],
      default: "Valid",
    },
    fine: String,
  },
  { _id: true }
);

/* =====================================
   BUS ROUTE STOPS
===================================== */

const routeStopSchema = new mongoose.Schema(
  {
    stopName: String,

    stopTime: String,

    passengerCount: {
      type: Number,
      default: 0,
    },

    stopOrder: Number,
  },
  { _id: true }
);

/* =====================================
   BUS ROUTES
===================================== */

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
    },

    routeCode: String,

    clientName: String,

    fromLocation: String,

    toLocation: String,

    amShiftStart: String,
    amShiftEnd: String,

    pmShiftStart: String,
    pmShiftEnd: String,

    frequency: String,

    driverName: String,

    conductorName: String,

    totalPassengers: {
      type: Number,
      default: 0,
    },

    daysOfWeek: [
      {
        type: String,
        enum: [
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
          "Daily",
        ],
      },
    ],

    monthlyRate: Number,

    ticketRate: Number,

    dailyRevenueTarget: Number,

    routeStops: [routeStopSchema],

    status: {
      type: String,
      enum: [
        "Active",
        "Inactive",
        "Completed",
      ],
      default: "Active",
    },
  },
  { _id: true, timestamps: true }
);

/* =====================================
   BUS TICKET LOG
===================================== */

const ticketLogSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    routeName: String,

    tripDate: String,

    shift: {
      type: String,
      enum: ["AM", "PM"],
    },

    tripNo: Number,

    boardedPassengers: {
      type: Number,
      default: 0,
    },

    ticketsSold: {
      type: Number,
      default: 0,
    },

    cashCollected: {
      type: Number,
      default: 0,
    },

    conductorName: String,

    verified: {
      type: Boolean,
      default: false,
    },

    remarks: String,
  },
  { _id: true, timestamps: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    regNo: {
      type: String,
      required: true,
    },
    fleet: {
      type: String,
      required: true,
      enum: [
        "vehicle",
        "equipment",
        "bus",
        "tyre",
      ],
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Truck",
        "Trailer",
        "LCV",
        "Container",
        "Tanker",
        "Mini Truck",
        /**Equipment Types***/
        "Backhoe",
        "Excavator",
        "Mini",
        "Vibratory",
        "Crane",
        "Telehandler",
        "Grader",
        "Concrete",
        "Transit",
        "Bus"
      ],
    },
    make: String,
    model:  String,
    year: Number,
    engineNo: String,
    chassisNo: String,
    axle: String,
    gvw: Number,
    currentKm: Number,
    healthStatus: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Critical"],
      default: "Good",
    },
    ownerShip: String,
    insuranceExpiryDate: String,
    rcBookExpiryDate: String,
    fcExpiryDate: String,
    taxExpiryDate: String,
    permitExpiryDate: String,
    pollutionExpiryDate: String,
    permitType: String,
    purchaseCost: Number,
    tollTagAvailable: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [        
        "Active",
        "In Transit",
        "Maintenance",
        "Breakdown",
        "On Trip",
        "Inactive",
        "On Site",
        "Available",
        "Overdue Compliance",
    ],
      default: "Available"
    },

    /**Equipment***/
    serialNo: String,
    hourlyRate: Number,
    minShiftHrs: Number,
    siteName: String,
    clientName: String,
    currentEngineHours: {
      type: Number,
      default: 0,
    },
    lastPmHours: {
      type: Number,
      default: 0,
    },
    pmIntervalHours: {
      type: Number,
      default: 250,
    },
    nextPmDueHours: Number,
    remainingPmHours: Number,
    healthPercentage: Number,
    loggedHrs: [loggedHrsSchema],

    /**Bus***/
    tripType: {
      type: String,
      enum: [
        "Corporate Shuttle",
        "School Bus",
        "Tourism Charter",
        "Staff Transport",
        "Contract Carriage",
        "Local Stage",
        "Inter City",
        "Event Transport",
      ],
    },
    busName: String,
    seatingCapacity: Number,
    standingCapacity: Number,
    acType: {
      type: String,
      enum: ["AC", "Non-AC"],
    },
    fuelType: String,
    fromLocation: String,
    toLocation: String,
    conductor: String,
    mvTaxDueDate: String,
    fitnessScore: {
      type: Number,
      default: 0,
    },
    complianceDocs: [complianceSchema],
    routes: [routeSchema],
    ticketLogs: [ticketLogSchema],

    /**Assigned Driver***/
    assignedDriver: {
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
      driverName: String,
      assignedDate: Date,
      status: {
        type: String,
        enum: ["Assigned", "Unassigned"],
        default: "Unassigned",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
