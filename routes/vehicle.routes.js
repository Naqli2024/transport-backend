const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleDashboard,
  getEquipmentDashboard,
  getBusDashboard,
  getRoutes,
  getCompliance,
  getDrivers,
  getTicketLogs,
} = require("../controllers/vehicle.controller");

router.post("/add-vehicle", auth, createVehicle);

router.get("/dashboard", auth, getVehicleDashboard);

router.get("/equipment-dashboard", auth, getEquipmentDashboard);

// bus dashboards
router.get("/bus-fleet", auth, getBusDashboard);

router.get("/bus-routes", auth, getRoutes);

router.get("/bus-compliance", auth, getCompliance);

router.get("/bus-drivers", auth, getDrivers);

router.get("/bus-ticket-logs", auth, getTicketLogs);

router.get("/", auth, getAllVehicles);

// router.put("/add-log/:vehicleId", auth, addLog);

// router.post("/:vehicleId/routes", auth, addRoute);

// router.get("/:vehicleId/routes", auth, getRoutes);

// router.post("/:vehicleId/ticket-log", auth, addTicketLog);

// router.get("/:vehicleId/ticket-logs", auth, getTicketLogs);

router.get("/:id", auth, getVehicleById);

router.put("/:id", auth, updateVehicle);

router.delete("/:id", auth, deleteVehicle);

module.exports = router;
