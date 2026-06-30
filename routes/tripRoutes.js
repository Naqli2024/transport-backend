const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const driverAuth = require("../middleware/driverAuth.middleware");

const {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  startTrip,
  completeLoading,
  arriveDestination,
  completeUnloading,
  closeTrip,
  getTripDashboard,
} = require("../controllers/tripController");

router.get("/dashboard", auth, getTripDashboard);

router.post("/create", auth, createTrip);

router.get("/", auth, getTrips);

router.get("/:id", auth, getTrip);

router.put("/:id", auth, updateTrip);

router.delete("/:id", auth, deleteTrip);

router.put("/:tripId/loading", auth, completeLoading);

router.put("/:tripId/start", auth, startTrip);

router.put("/:tripId/arrive", auth, arriveDestination);

router.put("/:tripId/unloading", auth, completeUnloading);

router.put("/:tripId/close", auth, closeTrip);

module.exports = router;
