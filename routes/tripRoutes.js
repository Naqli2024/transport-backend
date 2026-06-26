const router = require("express").Router();
const auth = require("../middleware/auth.middleware");

const {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  startTrip,
  getTripDashboard,
} = require("../controllers/tripController");

router.get("/dashboard", auth, getTripDashboard);

router.post("/create", auth, createTrip);

router.get("/", auth, getTrips);

router.get("/:id", auth, getTrip);

router.put("/:id", auth, updateTrip);

router.delete("/:id", auth, deleteTrip);

router.put("/:tripId/start", auth, startTrip);

module.exports = router;
