// controllers/vehicleController.js

const Vehicle = require("../models/Vehicle");


// ==============================
// CREATE VEHICLE
// ==============================

exports.createVehicle = async (req, res) => {
  try {
    const body = req.body;

    const {
      regNo,
      fleet,
      type,
    } = body;

    // Validation
    if (!regNo) {
      return res.status(400).json({
        success: false,
        message: "Registration number is required",
      });
    }

    // Duplicate check
    const existingVehicle = await Vehicle.findOne({
      regNo: regNo.toUpperCase(),
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle with this registration number already exists",
      });
    }

    let vehicleData = {
      regNo: regNo.toUpperCase(),
      fleet,
      type,
      status: body.status || "Active",
    };

    // =========================
    // VEHICLE TYPE FIELDS
    // =========================
    if (fleet === "vehicle") {
      vehicleData.make = body.make;
      vehicleData.model = body.model;
      vehicleData.year = body.year;
      vehicleData.engineNo = body.engineNo;
      vehicleData.chassisNo = body.chassisNo;
      vehicleData.axle = body.axle;
      vehicleData.gvw = body.gvw;
      vehicleData.currentKm = body.currentKm;
      vehicleData.ownerShip = body.ownerShip;
      vehicleData.insuranceExpiryDate = body.insuranceExpiryDate;
      vehicleData.rcBookExpiryDate = body.rcBookExpiryDate;
      vehicleData.fcExpiryDate = body.fcExpiryDate;
      vehicleData.taxExpiryDate = body.taxExpiryDate;
      vehicleData.permitExpiryDate = body.permitExpiryDate;
      vehicleData.pollutionExpiryDate = body.pollutionExpiryDate;
      vehicleData.permitType = body.permitType;
      vehicleData.purchaseCost = body.purchaseCost;
      vehicleData.tollTagAvailable = body.tollTagAvailable;
    }

    // =========================
    // EQUIPMENT FIELDS
    // =========================
    if (fleet === "equipment") {
      vehicleData.make = body.make;
      vehicleData.model = body.model;
      vehicleData.year = body.year;
      vehicleData.ownerShip = body.ownerShip;
      vehicleData.purchaseCost = body.purchaseCost;
      vehicleData.serialNo = body.serialNo;
      vehicleData.hourlyRate = body.hourlyRate;
      vehicleData.minShiftHrs = body.minShiftHrs;
      vehicleData.siteName = body.siteName;
      vehicleData.clientName = body.clientName;
      const currentEngineHours =
        body.currentEngineHours || 0;
      const lastPmHours =
        body.lastPmHours || 0;

      const pmIntervalHours =
        body.pmIntervalHours || 250;

      const nextPmDueHours =
        lastPmHours + pmIntervalHours;

      const remainingPmHours =
        nextPmDueHours - currentEngineHours;

      const usedHours =
        currentEngineHours - lastPmHours;

      const healthPercentage = Math.max(
        Math.round(
          ((pmIntervalHours - usedHours) /
            pmIntervalHours) * 100
        ),
        0
      );
    }

    // ==========================================
    // BUS FLEET
    // ==========================================

    if (fleet === "bus") {
      vehicleData.make = body.make;
      vehicleData.model = body.model;
      vehicleData.year = body.year;

      vehicleData.engineNo =
        body.engineNo;

      vehicleData.chassisNo =
        body.chassisNo;

      vehicleData.currentKm =
        body.currentKm;

      vehicleData.ownerShip =
        body.ownerShip;

      vehicleData.purchaseCost =
        body.purchaseCost;

      // ========================
      // BUS INFO
      // ========================

      vehicleData.tripType =
        body.tripType;

      vehicleData.busName =
        body.busName;

      vehicleData.seatingCapacity =
        body.seatingCapacity;

      vehicleData.standingCapacity =
        body.standingCapacity;

      vehicleData.acType =
        body.acType;

      vehicleData.fuelType =
        body.fuelType;

      vehicleData.fromLocation =
        body.fromLocation;

      vehicleData.toLocation =
        body.toLocation;

      vehicleData.conductor =
        body.conductor;

      vehicleData.fitnessScore =
        body.fitnessScore || 0;

      // ========================
      // COMPLIANCE
      // ========================

      vehicleData.insuranceExpiryDate =
        body.insuranceExpiryDate;

      vehicleData.fcExpiryDate =
        body.fcExpiryDate;

      vehicleData.permitExpiryDate =
        body.permitExpiryDate;

      vehicleData.pollutionExpiryDate =
        body.pollutionExpiryDate;

      vehicleData.mvTaxDueDate =
        body.mvTaxDueDate;

      vehicleData.permitType =
        body.permitType;

      // ========================
      // COMPLIANCE DOCS
      // ========================

      if (
        body.complianceDocs &&
        Array.isArray(body.complianceDocs)
      ) {
        vehicleData.complianceDocs =
          body.complianceDocs.map((doc) => ({
            docType: doc.docType,
            docNo: doc.docNo,
            issuer: doc.issuer,
            issueDate: doc.issueDate,
            expiryDate: doc.expiryDate,
            status: doc.status || "Valid",
            fine: doc.fine,
          }));
      }

      // =========================
      // ROUTES
      // =========================

      if (
        body.routes &&
        Array.isArray(body.routes)
      ) {
        vehicleData.routes =
          body.routes.map((route) => ({
            routeName:
              route.routeName,

            routeCode:
              route.routeCode,

            clientName:
              route.clientName,

            fromLocation:
              route.fromLocation,

            toLocation:
              route.toLocation,

            amShiftStart:
              route.amShiftStart,

            amShiftEnd:
              route.amShiftEnd,

            pmShiftStart:
              route.pmShiftStart,

            pmShiftEnd:
              route.pmShiftEnd,

            frequency:
              route.frequency,

            driverName:
              route.driverName,

            conductorName:
              route.conductorName,

            totalPassengers:
              route.totalPassengers || 0,

            daysOfWeek:
              route.daysOfWeek || [],

            monthlyRate:
              route.monthlyRate,

            ticketRate:
              route.ticketRate,

            dailyRevenueTarget:
              route.dailyRevenueTarget,

            status:
              route.status || "Active",

            routeStops:
              route.routeStops?.map(
                (stop, index) => ({
                  stopName:
                    stop.stopName,

                  stopTime:
                    stop.stopTime,

                  passengerCount:
                    stop.passengerCount || 0,

                  stopOrder:
                    stop.stopOrder ||
                    index + 1,
                })
              ) || [],
          }));
      }

      // =========================
      // TICKET LOGS
      // =========================

      if (
        body.ticketLogs &&
        Array.isArray(
          body.ticketLogs
        )
      ) {
        vehicleData.ticketLogs =
          body.ticketLogs.map(
            (ticket) => ({
              routeId:
                ticket.routeId,

              routeName:
                ticket.routeName,

              tripDate:
                ticket.tripDate,

              shift:
                ticket.shift,

              tripNo:
                ticket.tripNo,

              boardedPassengers:
                ticket.boardedPassengers || 0,

              ticketsSold:
                ticket.ticketsSold || 0,

              cashCollected:
                ticket.cashCollected || 0,

              conductorName:
                ticket.conductorName,

              verified:
                ticket.verified || false,

              remarks:
                ticket.remarks,
            })
          );
      }

      // ========================
      // ASSIGNED DRIVER
      // ========================

      if (body.assignedDriver) {
        vehicleData.assignedDriver = {
          driverId:
            body.assignedDriver.driverId,

          driverName:
            body.assignedDriver.driverName,

          assignedDate:
            body.assignedDriver.assignedDate ||
            new Date(),

          status:
            body.assignedDriver.status ||
            "Assigned",
        };
      }
    }

    // =========================
    // CREATE VEHICLE
    // =========================
    const vehicle = await Vehicle.create(vehicleData);

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET ALL VEHICLES
// ==============================
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==============================
// GET SINGLE VEHICLE
// ==============================
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==============================
// UPDATE VEHICLE
// ==============================
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==============================
// DELETE VEHICLE
// ==============================
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===============================
   ADD LOG
================================= */

exports.addLog = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const {
      operatorId,
      operatorName,
      startTime,
      endTime,
      fuelFilledLiters = 0,
      workDone = "",
      idleHours = 0,
    } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // WORK HOURS
    const workHours = (end - start) / (1000 * 60 * 60);

    // ENGINE HOURS LOGIC (IMPORTANT FIX)
    const startEngineHours = vehicle.currentEngineHours || 0;
    const endEngineHours = startEngineHours + workHours;

    vehicle.loggedHrs.push({
      operatorId,
      operatorName,

      startTime: start,
      endTime: end,

      startEngineHours,
      endEngineHours,

      workHours,
      idleHours,
      fuelFilledLiters,
      workDone,

      status: "Completed",
    });

    // update vehicle meter
    vehicle.engineHours = endEngineHours;

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: "Completed log added",
      data: vehicle.loggedHrs[vehicle.loggedHrs.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addLog = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const {
      operatorId,
      operatorName,
      endEngineHours,
      fuelFilledLiters = 0,
      workDone = "",
      idleHours = 0,
    } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }
    const startEngineHours = vehicle.currentEngineHours || 0;
    // WORK HOURS FROM ENGINE ONLY
    const workHours = endEngineHours - startEngineHours;

    if (workHours < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid engine hour values",
      });
    }

    vehicle.loggedHrs.push({
      operatorId,
      operatorName,

      startEngineHours,
      endEngineHours,

      workHours,
      idleHours,
      fuelFilledLiters,
      workDone,

      status: "Completed",
    });

    // update vehicle meter
    vehicle.currentEngineHours = endEngineHours;

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: "Completed log added",
      data: vehicle.loggedHrs[vehicle.loggedHrs.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addRoute = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const route = req.body;

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle.fleet !== "bus") {
      return res.status(400).json({
        success: false,
        message: "Routes allowed only for bus fleet",
      });
    }

    if (!vehicle.routes) {
      vehicle.routes = [];
    }

    vehicle.routes.push({
      routeName: route.routeName,
      routeCode: route.routeCode,
      clientName: route.clientName,
      fromLocation: route.fromLocation,
      toLocation: route.toLocation,
      amShiftStart: route.amShiftStart,
      amShiftEnd: route.amShiftEnd,
      pmShiftStart: route.pmShiftStart,
      pmShiftEnd: route.pmShiftEnd,
      frequency: route.frequency,
      driverName: route.driverName,
      conductorName: route.conductorName,
      totalPassengers: route.totalPassengers || 0,
      daysOfWeek: route.daysOfWeek || [],
      monthlyRate: route.monthlyRate,
      ticketRate: route.ticketRate,
      dailyRevenueTarget: route.dailyRevenueTarget,
      status: route.status || "Active",
      routeStops: route.routeStops || [],
    });

    await vehicle.save();

    res.json({
      success: true,
      message: "Route added successfully",
      data: vehicle.routes,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.addTicketLog = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const ticket = req.body;

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle.fleet !== "bus") {
      return res.status(400).json({
        success: false,
        message: "Ticket logs allowed only for bus fleet",
      });
    }

    vehicle.ticketLogs.push({
      routeId: ticket.routeId,
      routeName: ticket.routeName,
      tripDate: ticket.tripDate,
      shift: ticket.shift,
      tripNo: ticket.tripNo,
      boardedPassengers: ticket.boardedPassengers || 0,
      ticketsSold: ticket.ticketsSold || 0,
      cashCollected: ticket.cashCollected || 0,
      conductorName: ticket.conductorName,
      verified: ticket.verified || false,
      remarks: ticket.remarks,
    });

    await vehicle.save();

    res.json({
      success: true,
      message: "Ticket log added successfully",
      data: vehicle.ticketLogs,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getRoutes = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.vehicleId);

  res.json({
    success: true,
    data: vehicle.routes,
  });
};

exports.getTicketLogs = async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.vehicleId);

  res.json({
    success: true,
    data: vehicle.ticketLogs,
  });
};