const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  addLog,
  addRoute,
  getRoutes,
  addTicketLog,
  getTicketLogs,
} = require("../controllers/vehicle.controller");

router.post("/add-vehicle", auth, createVehicle);

router.get("/", auth, getAllVehicles);

router.get("/:id", auth, getVehicleById);

router.put("/:id", auth, updateVehicle);

router.delete("/:id", auth, deleteVehicle);

router.put("/add-log/:vehicleId", auth, addLog);

router.post( "/:vehicleId/routes", auth, addRoute);

router.get("/:vehicleId/routes", auth, getRoutes);

router.post("/:vehicleId/ticket-log", auth, addTicketLog);

router.get("/:vehicleId/ticket-logs", auth, getTicketLogs);

module.exports = router;