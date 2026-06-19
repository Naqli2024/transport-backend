const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  createDriver,
  getDrivers,
  getDriver,
  updateDriver,
  deleteDriver,
  getDriverDashboard,
} = require("../controllers/driver.controller");

router.post("/add-driver", auth, createDriver);

router.get("/", auth, getDrivers);

router.get("/dashboard", auth, getDriverDashboard);

router.get("/:driverId", auth, getDriver);

router.put("/:driverId", auth, updateDriver);

router.delete("/:driverId", auth, deleteDriver);

module.exports = router;
