// controllers/vehicleController.js

const Vehicle = require("../models/Vehicle");
const getDocumentStatus = require("../utils/getDocumentStatus");

// ==============================
// CREATE VEHICLE
// ==============================

exports.createVehicle = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body;

    const { regNo, fleet, type } = body;

    // Validation
    if (!fleet) {
      return res.status(400).json({
        success: false,
        message: "Fleet is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    if (!regNo) {
      return res.status(400).json({
        success: false,
        message: "Registration number is required",
      });
    }

    // Duplicate check
    const existingVehicle = await Vehicle.findOne({
      businessId,
      regNo: regNo.toUpperCase(),
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with this registration number already exists",
      });
    }

    let vehicleData = {
      businessId,
      regNo: regNo.toUpperCase(),
      fleet,
      type,
      status: body.status || "Available",
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
      const currentEngineHours = Number(body.currentEngineHours || 0);
      const lastPmHours = Number(body.lastPmHours || 0);

      const pmIntervalHours = Number(body.pmIntervalHours || 250);

      const nextPmDueHours = lastPmHours + pmIntervalHours;

      const remainingPmHours = nextPmDueHours - currentEngineHours;

      const usedHours = currentEngineHours - lastPmHours;

      const healthPercentage = Math.max(
        Math.round(((pmIntervalHours - usedHours) / pmIntervalHours) * 100),
        0,
      );
      vehicleData.currentEngineHours = currentEngineHours;

      vehicleData.lastPmHours = lastPmHours;

      vehicleData.pmIntervalHours = pmIntervalHours;

      vehicleData.nextPmDueHours = nextPmDueHours;

      vehicleData.remainingPmHours = remainingPmHours;

      vehicleData.healthPercentage = healthPercentage;
    }

    // ==========================================
    // BUS FLEET
    // ==========================================

    if (fleet === "bus") {
      vehicleData.make = body.make;
      vehicleData.model = body.model;
      vehicleData.year = body.year;

      vehicleData.engineNo = body.engineNo;

      vehicleData.chassisNo = body.chassisNo;

      vehicleData.currentKm = body.currentKm;

      vehicleData.ownerShip = body.ownerShip;

      vehicleData.purchaseCost = body.purchaseCost;

      // ========================
      // BUS INFO
      // ========================

      vehicleData.tripType = body.tripType;

      vehicleData.busName = body.busName;

      vehicleData.seatingCapacity = body.seatingCapacity;

      vehicleData.standingCapacity = body.standingCapacity;

      vehicleData.acType = body.acType;

      vehicleData.fuelType = body.fuelType;

      vehicleData.fromLocation = body.fromLocation;

      vehicleData.toLocation = body.toLocation;

      vehicleData.conductor = body.conductor;

      vehicleData.fitnessScore = body.fitnessScore || 0;

      // ========================
      // COMPLIANCE
      // ========================

      vehicleData.insuranceExpiryDate = body.insuranceExpiryDate;

      vehicleData.fcExpiryDate = body.fcExpiryDate;

      vehicleData.permitExpiryDate = body.permitExpiryDate;

      vehicleData.pollutionExpiryDate = body.pollutionExpiryDate;

      vehicleData.mvTaxDueDate = body.mvTaxDueDate;

      vehicleData.permitType = body.permitType;

      // ========================
      // COMPLIANCE DOCS
      // ========================

      if (body.complianceDocs && Array.isArray(body.complianceDocs)) {
        vehicleData.complianceDocs = body.complianceDocs.map((doc) => ({
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

      if (body.routes && Array.isArray(body.routes)) {
        vehicleData.routes = body.routes.map((route) => ({
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

          status: route.status || "Available",

          routeStops:
            route.routeStops?.map((stop, index) => ({
              stopName: stop.stopName,

              stopTime: stop.stopTime,

              passengerCount: stop.passengerCount || 0,

              stopOrder: stop.stopOrder || index + 1,
            })) || [],
        }));
      }

      // =========================
      // TICKET LOGS
      // =========================

      if (body.ticketLogs && Array.isArray(body.ticketLogs)) {
        vehicleData.ticketLogs = body.ticketLogs.map((ticket) => ({
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
        }));
      }

      // ========================
      // ASSIGNED DRIVER
      // ========================

      if (body.assignedDriver) {
        vehicleData.assignedDriver = {
          driverId: body.assignedDriver.driverId,

          driverName: body.assignedDriver.driverName,

          assignedDate: body.assignedDriver.assignedDate || new Date(),

          status: body.assignedDriver.status || "Assigned",
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
    const businessId = req.user.businessId;

    const vehicles = await Vehicle.find({
      businessId
    }).sort({ createdAt: -1 });

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
    const businessId = req.user.businessId;
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      businessId,
    });

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
    const businessId = req.user.businessId;

    const vehicle = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        businessId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      },
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
    const businessId = req.user.businessId;

    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      businessId,
    });

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

// Vehicle Dashboard
exports.getVehicleDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const vehicles = await Vehicle.find({
      businessId,
      fleet: "vehicle",
    });

    const totalFleet = vehicles.length;

    const active = vehicles.filter((v) => v.status === "Active").length;

    const onTrip = vehicles.filter((v) => v.status === "On Trip").length;

    const maintenance = vehicles.filter(
      (v) => v.status === "Maintenance",
    ).length;

    const complianceAlerts = [];

    const today = new Date();

    vehicles.forEach((vehicle) => {
      const checkDoc = (date, documentType) => {
        if (!date) return;

        const expiryDate = new Date(date);

        const diffDays = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24),
        );

        if (diffDays < 0) {
          complianceAlerts.push({
            _id: vehicle._id,
            regNo: vehicle.regNo,
            documentType,
            status: "Expired",
            daysRemaining: diffDays,
          });
        } else if (diffDays <= 30) {
          complianceAlerts.push({
            _id: vehicle._id,
            regNo: vehicle.regNo,
            documentType,
            status: "Expiring Soon",
            daysRemaining: diffDays,
          });
        }
      };

      checkDoc(vehicle.insuranceExpiryDate, "Insurance");

      checkDoc(vehicle.fcExpiryDate, "FC");

      checkDoc(vehicle.taxExpiryDate, "Road Tax");

      checkDoc(vehicle.permitExpiryDate, "Permit");

      checkDoc(vehicle.pollutionExpiryDate, "Pollution");
    });

    const dashboardVehicles = vehicles.map((vehicle) => ({
      _id: vehicle._id,
      regNo: vehicle.regNo,
      type: vehicle.type,
      make: vehicle.make,
      year: vehicle.year,
      currentKm: vehicle.currentKm || 0,
      healthPercentage: vehicle.healthPercentage || 0,

      insuranceStatus: getDocumentStatus(vehicle.insuranceExpiryDate),

      fcStatus: getDocumentStatus(vehicle.fcExpiryDate),

      taxStatus: getDocumentStatus(vehicle.taxExpiryDate),

      status: vehicle.status,
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFleet,
          active,
          onTrip,
          maintenance,
          complianceIssues: complianceAlerts.length,
        },
        complianceAlerts,
        vehicles: dashboardVehicles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// equipment dashboard
exports.getEquipmentDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const equipments = await Vehicle.find({
      businessId,
      fleet: "equipment",
    });

    const totalEquipment = equipments.length;

    const onSite = equipments.filter((e) => e.status === "On Site").length;

    const available = equipments.filter((e) => e.status === "Available").length;

    const serviceDue = equipments.filter((e) => e.remainingPmHours <= 0).length;

    let mtdBilled = 0;

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    equipments.forEach((equipment) => {
      const monthlyHours =
        equipment.loggedHrs
          ?.filter((log) => log.createdAt >= startOfMonth)
          .reduce((sum, log) => sum + (log.workHours || 0), 0) || 0;

      mtdBilled += monthlyHours * (equipment.hourlyRate || 0);
    });

    const equipmentCards = equipments.map((equipment) => {
      let pmStatus = "Healthy";

      if (equipment.remainingPmHours <= 0) {
        pmStatus = "PM OVERDUE";
      } else if (equipment.remainingPmHours <= 50) {
        pmStatus = "Next PM Soon";
      }

      return {
        _id: equipment._id,
        regNo: equipment.regNo,
        type: equipment.type,
        make: equipment.make,
        model: equipment.model,
        year: equipment.year,

        operatorName:
          equipment.loggedHrs?.[equipment.loggedHrs.length - 1]?.operatorName ||
          "Not Assigned",

        siteName: equipment.siteName,

        clientName: equipment.clientName,

        currentEngineHours: equipment.currentEngineHours,

        healthPercentage: equipment.healthPercentage,

        hourlyRate: equipment.hourlyRate,

        nextPmDueHours: equipment.nextPmDueHours,

        remainingPmHours: equipment.remainingPmHours,

        pmStatus,

        status: equipment.status,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEquipment,
          onSite,
          available,
          serviceDue,
          mtdBilled,
        },

        equipments: equipmentCards,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bus Dashboards
// Bus Fleet Data
exports.getBusDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const buses = await Vehicle.find({
      businessId,
      fleet: "bus",
    });

    const totalFleet = buses.length;

    const active = buses.filter(
      (bus) => bus.status === "Active" || bus.status === "On Trip",
    ).length;

    const available = buses.filter((bus) => bus.status === "Available").length;

    let complianceIssues = 0;

    let mtdRevenue = 0;

    const today = new Date();

    buses.forEach((bus) => {
      [
        bus.insuranceExpiryDate,
        bus.fcExpiryDate,
        bus.permitExpiryDate,
        bus.pollutionExpiryDate,
        bus.mvTaxDueDate,
      ].forEach((date) => {
        if (date && new Date(date) < today) {
          complianceIssues++;
        }
      });

      bus.ticketLogs.forEach((log) => {
        mtdRevenue += log.cashCollected || 0;
      });
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFleet,
          active,
          available,
          complianceIssues,
          mtdRevenue,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bus Routes
exports.getRoutes = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const buses = await Vehicle.find({
      businessId,
      fleet: "bus",
    });

    const routes = [];

    buses.forEach((bus) => {
      bus.routes.forEach((route) => {
        routes.push({
          busId: bus._id,

          regNo: bus.regNo,

          busName: `${bus.make} ${bus.model}`,

          routeId: route._id,

          routeName: route.routeName,

          clientName: route.clientName,

          monthlyRate: route.monthlyRate,

          amShift: `${route.amShiftStart} - ${route.amShiftEnd}`,

          pmShift: `${route.pmShiftStart} - ${route.pmShiftEnd}`,

          daysOfWeek: route.daysOfWeek,

          totalPassengers: route.totalPassengers,

          status: route.status,

          routeStops: route.routeStops,
        });
      });
    });

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bus Compliance Data
exports.getCompliance = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const buses = await Vehicle.find({
      businessId,
      fleet: "bus",
    });

    const documents = [];

    let expired = 0;
    let critical = 0;
    let dueSoon = 0;
    let valid = 0;

    const today = new Date();

    buses.forEach((bus) => {
      bus.complianceDocs.forEach((doc) => {
        const expiry = new Date(doc.expiryDate);

        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        let status = "Valid";

        if (diffDays < 0) {
          status = "Expired";
          expired++;
        } else if (diffDays <= 30) {
          status = "Critical";
          critical++;
        } else if (diffDays <= 90) {
          status = "Due Soon";
          dueSoon++;
        } else {
          valid++;
        }

        documents.push({
          busId: bus._id,
          regNo: bus.regNo,

          docType: doc.docType,

          docNo: doc.docNo,

          issuer: doc.issuer,

          expiryDate: doc.expiryDate,

          status,

          fine: doc.fine,
        });
      });
    });

    res.status(200).json({
      success: true,
      summary: {
        expired,
        critical,
        dueSoon,
        valid,
      },
      documents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bus Driver Data
exports.getDrivers = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const buses = await Vehicle.find({
      businessId,
      fleet: "bus",
    });

    const drivers = buses.map((bus) => ({
      busId: bus._id,

      busRegNo: bus.regNo,

      driverId: bus.assignedDriver?.driverId || null,

      driverName: bus.assignedDriver?.driverName || null,

      status: bus.assignedDriver?.status || "Unassigned",
    }));

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bus ticket-logs data dashboard
exports.getTicketLogs = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const buses = await Vehicle.find({
      businessId,
      fleet: "bus",
    });

    const logs = [];

    let totalPax = 0;
    let ticketsSold = 0;
    let cashCollected = 0;
    let verified = 0;

    buses.forEach((bus) => {
      bus.ticketLogs.forEach((log) => {
        totalPax += log.boardedPassengers || 0;

        ticketsSold += log.ticketsSold || 0;

        cashCollected += log.cashCollected || 0;

        if (log.verified) {
          verified++;
        }

        logs.push({
          busId: bus._id,

          regNo: bus.regNo,

          routeName: log.routeName,

          tripDate: log.tripDate,

          shift: log.shift,

          tripNo: log.tripNo,

          boardedPassengers: log.boardedPassengers,

          ticketsSold: log.ticketsSold,

          cashCollected: log.cashCollected,

          conductorName: log.conductorName,

          verified: log.verified,
        });
      });
    });

    res.status(200).json({
      success: true,
      summary: {
        totalPax,
        ticketsSold,
        cashCollected,
        verified,
      },
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
