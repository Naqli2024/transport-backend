const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleDashboard,
  getEquipmentDashboard,
  getBusDashboard,
  getRoutes,
  getCompliance,
  getDrivers,
  getTicketLogs,
  bulkUploadVehicleDocuments,
  getVehicleDocuments,
  updateVehicleDocument,
  deleteVehicleDocument,
} = require("../controllers/vehicle.controller");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/add-vehicle", auth, createVehicle);

router.get("/dashboard", auth, getVehicleDashboard);

router.get("/equipment-dashboard", auth, getEquipmentDashboard);

// bus dashboards
router.get("/bus-fleet", auth, getBusDashboard);

router.get("/bus-routes", auth, getRoutes);

router.get("/bus-compliance", auth, getCompliance);

router.get("/bus-drivers", auth, getDrivers);

router.get("/bus-ticket-logs", auth, getTicketLogs);

router.get("/", auth, getAllVehicles);

// router.put("/add-log/:vehicleId", auth, addLog);

// router.post("/:vehicleId/routes", auth, addRoute);

// router.get("/:vehicleId/routes", auth, getRoutes);

// router.post("/:vehicleId/ticket-log", auth, addTicketLog);

// router.get("/:vehicleId/ticket-logs", auth, getTicketLogs);

router.get("/:id", auth, getVehicleById);

router.put("/:id", auth, updateVehicle);

router.delete("/:id", auth, deleteVehicle);

// vehicle documents
router.post(
  "/:vehicleId/documents",
  auth,
  upload.fields([
    { name: "rcBook", maxCount: 1 },
    { name: "insurance", maxCount: 1 },
    { name: "fitnessCertificate", maxCount: 1 },
    { name: "roadTax", maxCount: 1 },
    { name: "permit", maxCount: 1 },
    { name: "pollution", maxCount: 1 },
    { name: "fastag", maxCount: 1 },
    { name: "nationalPermit", maxCount: 1 },
    { name: "statePermit", maxCount: 1 },
    { name: "other", maxCount: 10 },
  ]),
  bulkUploadVehicleDocuments
);

router.get(
  "/:vehicleId/documents",
  auth,
  getVehicleDocuments
);

router.put(
  "/documents/:documentId",
  auth,
  upload.single("file"),
  updateVehicleDocument
);

router.delete(
  "/documents/:documentId",
  auth,
  deleteVehicleDocument
);

module.exports = router;
