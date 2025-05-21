const express = require("express");
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');

const router = express.Router();
router.post("/products", upload.single("image"), productController.createProduct);
router.put("/products/:id", upload.single("image"), productController.updateProduct);
//router.post("/", productController.createProduct);
router.get("/products", productController.getAllProducts);
router.get("/products/:id", productController.getProductById);
//router.put("/:id", productController.updateProduct);
router.delete("/products/:id", productController.deleteProduct);
router.get("/products/barcode/:barcode", productController.getProductByBarcode);
// Bulk Import Route (POST)
router.post("/bulk-import", upload.none(), productController.bulkCreateProducts);
router.get("/bulk-export", productController.exportProducts);
router.delete("/prices/:id", productController.deletePriceById);

module.exports = router;
