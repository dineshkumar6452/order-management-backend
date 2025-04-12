const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/dashboard/orders", dashboardController.getOrderStats);
router.get("/dashboard/pending-products", dashboardController.getPendingProducts); // ✅ Unique pending products

module.exports = router;
