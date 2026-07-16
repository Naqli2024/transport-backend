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
  updatePostTripInspection
} = require("../controllers/inspection.controller");
const commonAuth = require("../middleware/commonAuth.middleware");

router.post("/create", driverAuth, createPreTripInspection);

router.get("/", commonAuth, getPreTripInspections);

router.put("/:inspectionId/pretrip", driverAuth, updatePreTripInspection);

router.post("/:tripId/posttripinspection", driverAuth, postTripInspection);

router.get("/posttripinspection", commonAuth, getAllPostInspection);

router.get("/posttripinspection/:id", commonAuth, getPostInspectionById);

router.put("/:inspectionId/post-trip", driverAuth, updatePostTripInspection);

router.get("/:id", commonAuth, getPreTripInspection);

module.exports = router;
