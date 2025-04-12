const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/orders", orderController.createOrder);
router.get("/orders", orderController.getAllOrders);
router.get("/orders/:id", orderController.getOrderById);
router.put("/orders/:orderId/items/:itemId/received",orderController.markOrderItemAsReceived);

module.exports = router;
 