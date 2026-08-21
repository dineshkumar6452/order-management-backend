const express = require("express");
const invoiceController = require("../controllers/invoiceController");

const router = express.Router();

// POST /api/invoices/email
router.post("/invoices/email", invoiceController.emailInvoice);

module.exports = router;
