const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  createFuelEntry,
  getTripFuelEntries,
  updateFuelEntry,
  deleteFuelEntry,
  getTripFuelSummary,
  getFuelDashboard,
} = require("../controllers/fuelEntry.controller");

router.post("/:tripId/entry", auth, createFuelEntry);
router.get("/dashboard", auth, getFuelDashboard);
router.get("/:tripId/summary", auth, getTripFuelSummary);
router.get("/:tripId/fuel", auth, getTripFuelEntries);
router.put("/:fuelId", auth, updateFuelEntry);
router.delete("/:fuelId", auth, deleteFuelEntry);

module.exports = router;
