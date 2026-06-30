const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const driverAuth = require("../middleware/driverAuth.middleware");

const {
  createDriver,
  getDrivers,
  getDriver,
  updateDriver,
  deleteDriver,
  getDriverDashboard,
  getCurrentTrip,
} = require("../controllers/driver.controller");

router.post("/add-driver", auth, createDriver);

router.get("/", auth, getDrivers);

router.get("/dashboard", auth, getDriverDashboard);

// Driver mobile APIs
router.get("/current-trip", driverAuth, getCurrentTrip);

router.get("/:driverId", driverAuth, getDriver);

router.put("/:driverId", auth, updateDriver);

router.delete("/:driverId", auth, deleteDriver);

module.exports = router;
