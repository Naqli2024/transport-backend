const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customer.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ==============================
// CREATE CUSTOMER
// ==============================

router.post("/create", authMiddleware, customerController.createCustomer);

// ==============================
// GET CUSTOMER DASHBOARD
// ==============================

router.get(
  "/dashboard",
  authMiddleware,
  customerController.getCustomerDashboard,
);

// ==============================
// GET ALL CUSTOMERS
// ==============================

router.get("/", authMiddleware, customerController.getCustomers);

// ==============================
// GET SINGLE CUSTOMER
// ==============================

router.get("/:id", authMiddleware, customerController.getCustomer);

// ==============================
// UPDATE CUSTOMER
// ==============================

router.put("/:id", authMiddleware, customerController.updateCustomer);

// ==============================
// DELETE CUSTOMER
// ==============================

router.delete("/:id", authMiddleware, customerController.deleteCustomer);

module.exports = router;
