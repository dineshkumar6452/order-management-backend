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

module.exports = router;
