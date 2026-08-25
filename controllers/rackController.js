const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Rack = require("../models/Rack");
const RackItem = require("../models/RackItem");
const Product = require("../models/Product");

// ---------- Helpers ----------

function serializeRackSummary(rack) {
  const items = rack.items || [];
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  return {
    id: rack.id,
    code: rack.code,
    name: rack.name,
    productCount: items.length,
    totalQuantity: totalQty,
    createdAt: rack.createdAt,
    updatedAt: rack.updatedAt,
  };
}

function serializeRackItem(item) {
  return {
    id: item.id,
    productId: item.productId,
    barcode: item.barcode,
    quantity: item.quantity,
    name: item.product ? item.product.name : null,
    imageUrl: item.product ? item.product.imageUrl : null,
    updatedAt: item.updatedAt,
  };
}

// ---------- Racks ----------

// POST /api/racks  { code, name? }
// Get-or-create: scanning/typing an existing rack code resumes it instead
// of creating a duplicate.
exports.getOrCreateRack = async (req, res) => {
  try {
    const { code, name } = req.body || {};
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, message: "Rack code is required." });
    }

    const [rack] = await Rack.findOrCreate({
      where: { code: code.trim() },
      defaults: { name: name || null },
    });

    return res.status(200).json({ success: true, rack: { id: rack.id, code: rack.code, name: rack.name } });
  } catch (error) {
    console.error("❌ [rackController] getOrCreateRack failed:", error);
    return res.status(500).json({ success: false, message: "Failed to create/find rack." });
  }
};

// GET /api/racks
// Lists all racks, most-recently-updated first, plus overall analytics.
exports.listRacks = async (req, res) => {
  try {
    const racks = await Rack.findAll({
      include: [{ model: RackItem, as: "items" }],
      order: [["updatedAt", "DESC"]],
    });

    const summaries = racks.map(serializeRackSummary);

    const totalRacks = summaries.length;
    const totalQuantity = summaries.reduce((sum, r) => sum + r.totalQuantity, 0);
    const distinctProductIds = new Set();
    racks.forEach((rack) => (rack.items || []).forEach((item) => distinctProductIds.add(item.productId)));

    return res.status(200).json({
      success: true,
      racks: summaries,
      analytics: {
        totalRacks,
        totalDistinctProducts: distinctProductIds.size,
        totalQuantity,
        lastUpdatedRack: summaries.length > 0 ? summaries[0] : null,
      },
    });
  } catch (error) {
    console.error("❌ [rackController] listRacks failed:", error);
    return res.status(500).json({ success: false, message: "Failed to list racks." });
  }
};

// GET /api/racks/:id
exports.getRackDetail = async (req, res) => {
  try {
    const rack = await Rack.findByPk(req.params.id, {
      include: [{ model: RackItem, as: "items", include: [{ model: Product, as: "product" }] }],
    });
    if (!rack) {
      return res.status(404).json({ success: false, message: "Rack not found." });
    }

    return res.status(200).json({
      success: true,
      rack: {
        id: rack.id,
        code: rack.code,
        name: rack.name,
        createdAt: rack.createdAt,
        updatedAt: rack.updatedAt,
        items: (rack.items || []).map(serializeRackItem),
      },
    });
  } catch (error) {
    console.error("❌ [rackController] getRackDetail failed:", error);
    return res.status(500).json({ success: false, message: "Failed to load rack." });
  }
};

// ---------- Items within a rack ----------

// POST /api/racks/:id/items  { barcode, quantity? }
// Scans/adds a product into a rack. If the barcode isn't a known product,
// responds with productNotFound:true so the client can prompt "create new
// product?" instead of silently failing.
exports.addOrUpdateItem = async (req, res) => {
  try {
    const rack = await Rack.findByPk(req.params.id);
    if (!rack) {
      return res.status(404).json({ success: false, message: "Rack not found." });
    }

    const { barcode, quantity } = req.body || {};
    if (!barcode || typeof barcode !== "string" || !barcode.trim()) {
      return res.status(400).json({ success: false, message: "barcode is required." });
    }
    const qtyToAdd = Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : 1;

    const product = await Product.findOne({ where: { barcode: barcode.trim() } });
    if (!product) {
      // Not an error exactly - the client should offer to create this product.
      return res.status(404).json({
        success: false,
        productNotFound: true,
        barcode: barcode.trim(),
        message: "No product found for this barcode.",
      });
    }

    const [item] = await RackItem.findOrCreate({
      where: { rackId: rack.id, productId: product.id },
      defaults: { barcode: product.barcode, quantity: 0 },
    });
    item.quantity += qtyToAdd;
    item.barcode = product.barcode;
    await item.save();

    // Touch the rack's updatedAt so "last updated racks" reflects this.
    await Rack.update({ updatedAt: new Date() }, { where: { id: rack.id }, silent: false });

    return res.status(200).json({
      success: true,
      item: {
        id: item.id,
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        quantity: item.quantity,
      },
    });
  } catch (error) {
    console.error("❌ [rackController] addOrUpdateItem failed:", error);
    return res.status(500).json({ success: false, message: "Failed to add item to rack." });
  }
};

// PUT /api/racks/:id/items/:productId  { quantity }
// Sets an exact quantity. quantity <= 0 removes the item.
exports.setItemQuantity = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { quantity } = req.body || {};
    const newQty = Number(quantity);
    if (!Number.isFinite(newQty)) {
      return res.status(400).json({ success: false, message: "A numeric quantity is required." });
    }

    const item = await RackItem.findOne({ where: { rackId: id, productId } });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in this rack." });
    }

    if (newQty <= 0) {
      await item.destroy();
    } else {
      item.quantity = newQty;
      await item.save();
    }

    await Rack.update({ updatedAt: new Date() }, { where: { id }, silent: false });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ [rackController] setItemQuantity failed:", error);
    return res.status(500).json({ success: false, message: "Failed to update item quantity." });
  }
};

// DELETE /api/racks/:id/items/:productId
exports.removeItem = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const deleted = await RackItem.destroy({ where: { rackId: id, productId } });
    if (deleted === 0) {
      return res.status(404).json({ success: false, message: "Item not found in this rack." });
    }
    await Rack.update({ updatedAt: new Date() }, { where: { id }, silent: false });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ [rackController] removeItem failed:", error);
    return res.status(500).json({ success: false, message: "Failed to remove item." });
  }
};

// ---------- Moving stock between racks ----------

// POST /api/racks/:id/move
// { targetRackCode, items?: [{ productId, quantity }] }
// If "items" is omitted, moves everything in the source rack. Otherwise
// moves only the specified productId/quantity pairs (partial move).
exports.moveItems = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const sourceRackId = req.params.id;
    const { targetRackCode, items } = req.body || {};

    if (!targetRackCode || typeof targetRackCode !== "string" || !targetRackCode.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "targetRackCode is required." });
    }

    const sourceRack = await Rack.findByPk(sourceRackId, { transaction: t });
    if (!sourceRack) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Source rack not found." });
    }

    if (targetRackCode.trim() === sourceRack.code) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Source and target racks are the same." });
    }

    const [targetRack] = await Rack.findOrCreate({
      where: { code: targetRackCode.trim() },
      defaults: {},
      transaction: t,
    });

    // Which items to move: either everything currently in the source rack,
    // or just the caller-specified subset.
    let sourceItems;
    if (Array.isArray(items) && items.length > 0) {
      sourceItems = await RackItem.findAll({
        where: {
          rackId: sourceRack.id,
          productId: { [Op.in]: items.map((i) => i.productId) },
        },
        transaction: t,
      });
    } else {
      sourceItems = await RackItem.findAll({ where: { rackId: sourceRack.id }, transaction: t });
    }

    const requestedQtyByProduct = new Map(
      Array.isArray(items) ? items.map((i) => [i.productId, Number(i.quantity)]) : []
    );

    const moved = [];

    for (const sourceItem of sourceItems) {
      const requestedQty = requestedQtyByProduct.has(sourceItem.productId)
        ? requestedQtyByProduct.get(sourceItem.productId)
        : sourceItem.quantity; // "move all" case
      const qtyToMove = Math.max(0, Math.min(requestedQty, sourceItem.quantity));
      if (qtyToMove <= 0) continue;

      // Decrement/remove from source
      if (qtyToMove >= sourceItem.quantity) {
        await sourceItem.destroy({ transaction: t });
      } else {
        sourceItem.quantity -= qtyToMove;
        await sourceItem.save({ transaction: t });
      }

      // Increment/create on target
      const [targetItem] = await RackItem.findOrCreate({
        where: { rackId: targetRack.id, productId: sourceItem.productId },
        defaults: { barcode: sourceItem.barcode, quantity: 0 },
        transaction: t,
      });
      targetItem.quantity += qtyToMove;
      targetItem.barcode = sourceItem.barcode;
      await targetItem.save({ transaction: t });

      moved.push({ productId: sourceItem.productId, quantity: qtyToMove });
    }

    await Rack.update({ updatedAt: new Date() }, { where: { id: sourceRack.id }, transaction: t, silent: false });
    await Rack.update({ updatedAt: new Date() }, { where: { id: targetRack.id }, transaction: t, silent: false });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Moved ${moved.length} item type(s) to "${targetRack.code}".`,
      targetRackId: targetRack.id,
      targetRackCode: targetRack.code,
      moved,
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ [rackController] moveItems failed:", error);
    return res.status(500).json({ success: false, message: "Failed to move items." });
  }
};

// ---------- Product placement lookup ----------

// GET /api/racks/placements/:barcode
// "Where is this product?" - every rack containing it, with quantities.
exports.getProductPlacements = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ where: { barcode } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found for this barcode." });
    }

    const items = await RackItem.findAll({
      where: { productId: product.id },
      include: [{ model: Rack, as: "rack" }],
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      product: { id: product.id, name: product.name, barcode: product.barcode },
      placements: items.map((item) => ({
        rackId: item.rackId,
        rackCode: item.rack ? item.rack.code : null,
        rackName: item.rack ? item.rack.name : null,
        quantity: item.quantity,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error("❌ [rackController] getProductPlacements failed:", error);
    return res.status(500).json({ success: false, message: "Failed to look up product placements." });
  }
};
