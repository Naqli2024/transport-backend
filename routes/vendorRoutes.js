const router = require("express").Router();

const auth = require("../middleware/auth.middleware");

const {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  getVendorSettlement,
  settleVendor,
} = require("../controllers/vendorController");

router.post("/add", auth, createVendor);

router.get("/", auth, getVendors);

router.get("/:id", auth, getVendor);

router.put("/:id", auth, updateVendor);

router.delete("/:id", auth, deleteVendor);

router.get(
  "/:vendorId/settlement",
  auth,
  getVendorSettlement
);

// Settle vendor amount
router.post(
  "/:vendorId/settlement",
  auth,
  settleVendor
);

module.exports = router;
