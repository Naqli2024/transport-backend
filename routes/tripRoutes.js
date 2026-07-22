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
  reachedPickup,
  completeLoading,
  arriveDestination,
  completeUnloading,
  verifyDeliveryOtp,
  resendDeliveryOtp,
  closeTrip,
  getTripDashboard,
  uploadTripDocument,
  bulkUploadTripDocuments,
  getTripDocuments,
  updateTripDocument,
  deleteTripDocument,
  completeWeighbridge,
  getWeighbridge,
  updateWeighbridge,
  createFuelEntry,
  getTripFuelEntries,
  getFuelEntry,
  updateFuelEntry,
  uploadPod,
  createTripExpense,
  deleteTripExpense,
  getTripExpenses,
  updateTripExpense
} = require("../controllers/tripController");
const commonAuth = require("../middleware/commonAuth.middleware");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    console.log(file);
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid file type: ${file.mimetype}`
        )
      );
    }

    cb(null, true);
  },
});

router.get("/dashboard", auth, getTripDashboard);

router.post("/create", auth, createTrip);

router.get("/", auth, getTrips);

router.get("/:id", commonAuth, getTrip);

router.put("/:id", auth, updateTrip);

router.delete("/:id", auth, deleteTrip);

router.put("/:tripId/reached-pickup", driverAuth, reachedPickup);

router.put("/:tripId/loading", driverAuth, completeLoading);

router.put("/:tripId/start", driverAuth, startTrip);

router.put("/:tripId/arrive", driverAuth, arriveDestination);

router.put("/:tripId/unloading", driverAuth, completeUnloading);

router.post(
    "/:tripId/verify-delivery-otp",
    driverAuth,
    verifyDeliveryOtp
);

router.post(
  "/:tripId/resend-delivery-otp",
  driverAuth,
  resendDeliveryOtp
);

router.put("/:tripId/close", auth, closeTrip);

router.post(
  "/:tripId/documents",
  auth,
  upload.single("file"),
  uploadTripDocument,
);

router.post(
  "/:tripId/documents/bulk-upload",
  auth,
  upload.fields([
    { name: "ewayBill", maxCount: 1 },
    { name: "invoice", maxCount: 1 },
    { name: "lr", maxCount: 1 },
    { name: "deliveryChallan", maxCount: 1 },
  ]),
  bulkUploadTripDocuments
);

router.get("/:tripId/documents", commonAuth, getTripDocuments);

router.put(
  "/documents/:documentId",
  auth,
  upload.single("file"),
  updateTripDocument,
);

router.delete("/documents/:documentId", auth, deleteTripDocument);

router.post(
  "/:tripId/weighbridge",
  driverAuth,
  upload.single("receipt"),
  completeWeighbridge,
);

router.get("/:tripId/weighbridge", commonAuth, getWeighbridge);

router.put(
  "/:tripId/weighbridge",
  driverAuth,
  upload.single("receipt"),
  updateWeighbridge,
);

router.post(
    "/:tripId/fuel",
    driverAuth,
    upload.single("bill"),
    createFuelEntry
);

router.get(
    "/:tripId/fuel",
    commonAuth,
    getTripFuelEntries
);

router.get(
    "/fuel/:fuelId",
    commonAuth,
    getFuelEntry
);

router.put(
    "/fuel/:fuelId",
    driverAuth,
    upload.single("bill"),
    updateFuelEntry
);

router.post(
  "/:tripId/pod",
  driverAuth,
  upload.fields([
    {
      name: "pod",
      maxCount: 1,
    },
    {
      name: "invoice",
      maxCount: 1,
    },
    {
      name: "deliveryChallan",
      maxCount: 1,
    },
  ]),
  uploadPod
);

router.post(
  "/:tripId/expenses",
  driverAuth,
  upload.single("bill"),
  createTripExpense
);

router.get(
  "/:tripId/expenses",
  commonAuth,
  getTripExpenses
);

router.put(
  "/expenses/:expenseId",
  driverAuth,
  upload.single("bill"),
  updateTripExpense
);

router.delete(
  "/expenses/:expenseId",
  driverAuth,
  deleteTripExpense
);

module.exports = router;
