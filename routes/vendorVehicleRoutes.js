const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const {
  createVendorVehicle,
  getVendorVehicles,
  getVendorVehicle,
  updateVendorVehicle,
  deleteVendorVehicle,
} = require("../controllers/vendorVehicleController");

router.post("/add", auth, createVendorVehicle);

router.get("/", auth, getVendorVehicles);

router.get("/:id", auth, getVendorVehicle);

router.put("/:id", auth, updateVendorVehicle);

router.delete("/:id", auth, deleteVendorVehicle);

module.exports = router;
