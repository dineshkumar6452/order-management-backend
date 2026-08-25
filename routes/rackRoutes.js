const express = require("express");
const router = express.Router();
const rackController = require("../controllers/rackController");

// Racks
router.post("/racks", rackController.getOrCreateRack);
router.get("/racks", rackController.listRacks);
router.get("/racks/:id", rackController.getRackDetail);

// Items within a rack
router.post("/racks/:id/items", rackController.addOrUpdateItem);
router.put("/racks/:id/items/:productId", rackController.setItemQuantity);
router.delete("/racks/:id/items/:productId", rackController.removeItem);

// Move stock between racks
router.post("/racks/:id/move", rackController.moveItems);

// Product placement lookup ("where is this product?")
router.get("/racks/placements/:barcode", rackController.getProductPlacements);

module.exports = router;
