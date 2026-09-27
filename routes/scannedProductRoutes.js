const express = require("express");
const scannedProductController = require("../controllers/scannedProductController");

const router = express.Router();

// Specific/string routes before the ":productId" wildcard-style one, same
// ordering fix applied earlier to productRoutes.js.
router.get("/scanned-products/search", scannedProductController.searchProducts);
router.get("/scanned-products/barcodes", scannedProductController.listBarcodeEntries);
router.post("/scanned-products/barcodes", scannedProductController.createBarcodeEntry);
router.get("/scanned-products/barcodes/:barcode", scannedProductController.checkBarcode);
router.put("/scanned-products/barcodes/:barcode", scannedProductController.updateBarcodeEntry);
router.get("/scanned-products/:productId", scannedProductController.getProductWithBarcodes);

module.exports = router;
