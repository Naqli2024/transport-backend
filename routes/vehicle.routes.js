const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicle.controller");

router.post("/add-vehicle", auth, createVehicle);

router.get("/", auth, getAllVehicles);

router.get("/:id", auth, getVehicleById);

router.put("/:id", auth, updateVehicle);

router.delete("/:id", auth, deleteVehicle);

module.exports = router;