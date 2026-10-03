const express = require("express");

const {
  getLocations,
  addLocation,
} = require("../controllers/locationController");

const router = express.Router();

router.get("/", getLocations);

router.post("/add", addLocation);

module.exports = router;