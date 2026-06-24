const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  createPreTripInspection,
  getPreTripInspections,
  getPreTripInspection,
} = require("../controllers/inspection.controller");

router.post("/create", auth, createPreTripInspection);
router.get("/", auth, getPreTripInspections);
router.get("/:id", auth, getPreTripInspection);

module.exports = router;
