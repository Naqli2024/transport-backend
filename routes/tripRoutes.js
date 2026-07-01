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
const commonAuth = require("../middleware/commonAuth.middleware");

router.get("/dashboard", auth, getTripDashboard);

router.post("/create", auth, createTrip);

router.get("/", auth, getTrips);

router.get("/:id", commonAuth, getTrip);

router.put("/:id", auth, updateTrip);

router.delete("/:id", auth, deleteTrip);

router.put("/:tripId/loading", driverAuth, completeLoading);

router.put("/:tripId/start", driverAuth, startTrip);

router.put("/:tripId/arrive", driverAuth, arriveDestination);

router.put("/:tripId/unloading", driverAuth, completeUnloading);

router.put("/:tripId/close", auth, closeTrip);

module.exports = router;
