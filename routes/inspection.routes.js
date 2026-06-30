const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  createPreTripInspection,
  getPreTripInspections,
  getPreTripInspection,
  postTripInspection,
  getAllPostInspection,
  getPostInspectionById,
} = require("../controllers/inspection.controller");

router.post("/create", auth, createPreTripInspection);

router.get("/", auth, getPreTripInspections);

router.post("/:tripId/posttripinspection", auth, postTripInspection);

router.get("/posttripinspection", auth, getAllPostInspection);

router.get("/posttripinspection/:id", auth, getPostInspectionById);

router.get("/:id", auth, getPreTripInspection);

module.exports = router;
