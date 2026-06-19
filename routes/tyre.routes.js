const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const {
  createTyre,
  getTyres,
  getTyreById,
  updateTyre,
  deleteTyre,
  assignTyre,
  addInspection,
  predictTyreLife,
  replaceTyre
} = require("../controllers/tyre.controller");

router.post("/add", auth, createTyre);

router.get("/all", auth, getTyres);

// router.get("/stock", auth, getStockTyres);

router.get("/:id", auth, getTyreById);

router.put("/:id", auth, updateTyre);

router.delete("/:id", auth, deleteTyre);

router.post(
  "/:id/assign",
  auth,
  assignTyre
);

router.post(
  "/:id/inspection",
  auth,
  addInspection
);

router.get(
  "/:id/predict",
  auth,
  predictTyreLife
);

router.post(
  "/:id/replace",
  auth,
  replaceTyre
);

module.exports = router;
