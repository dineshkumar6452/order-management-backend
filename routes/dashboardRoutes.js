const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/dashboard/orders", dashboardController.getOrderStats);
router.get("/dashboard/pending-products", dashboardController.getPendingProducts); // ✅ Unique pending products
// ✅ New: Account & Transaction dashboard data
router.get("/dashboard/account-transactions", dashboardController.getAccountTransactionStats);
router.get("/dashboard/inactive-accounts", dashboardController.getInactiveAccounts);

module.exports = router;
