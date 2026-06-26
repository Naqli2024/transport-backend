const express = require("express");
const router = express.Router();

const brokerController = require("../controllers/broker.controller");
const authMiddleware = require("../middleware/auth.middleware");

/* =================================
   CREATE BROKER
================================= */

router.post("/create", authMiddleware, brokerController.createBroker);

/* =================================
   BROKER DASHBOARD
================================= */

router.get("/dashboard", authMiddleware, brokerController.getBrokerDashboard);

/* =================================
   GET ALL BROKERS
================================= */

router.get("/", authMiddleware, brokerController.getAllBrokers);

/* =================================
   GET SINGLE BROKER
================================= */

router.get("/:id", authMiddleware, brokerController.getBrokerById);

/* =================================
   UPDATE BROKER
================================= */

router.put("/:id", authMiddleware, brokerController.updateBroker);

/* =================================
   DELETE BROKER
================================= */

router.delete("/:id", authMiddleware, brokerController.deleteBroker);

module.exports = router;
