const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload");

const {
  uploadFuelBill,
  approveFuel,
  rejectFuel,
  getFuelDashboard,
  getFuels,
} = require("../controllers/fuel.controller");

// router.post("/upload-bill", auth, upload.single("bill"), uploadFuelBill);

// router.get("/", auth, getFuels);

// router.get("/dashboard", auth, getFuelDashboard);

// router.put("/:id/approve", auth, approveFuel);

// router.put("/:id/reject", auth, rejectFuel);

module.exports = router;
