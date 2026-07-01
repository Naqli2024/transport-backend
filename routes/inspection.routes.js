const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const driverAuth = require("../middleware/driverAuth.middleware");
const {
  createPreTripInspection,
  getPreTripInspections,
  getPreTripInspection,
  updatePreTripInspection,
  postTripInspection,
  getAllPostInspection,
  getPostInspectionById,
} = require("../controllers/inspection.controller");
const commonAuth = require("../middleware/commonAuth.middleware");

router.post("/create", driverAuth, createPreTripInspection);

router.get("/", auth, getPreTripInspections);

router.put("/:inspectionId", driverAuth, updatePreTripInspection);

router.post("/:tripId/posttripinspection", driverAuth, postTripInspection);

router.get("/posttripinspection", auth, getAllPostInspection);

router.get("/posttripinspection/:id", commonAuth, getPostInspectionById);

router.get("/:id", commonAuth, getPreTripInspection);

module.exports = router;
