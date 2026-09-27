const { Op } = require("sequelize");
const ScannedProduct = require("../models/ScannedProduct");
const ScannedProductBarcode = require("../models/ScannedProductBarcode");

function serializeBarcode(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    scannedProductId: row.scannedProductId,
    wholesaleRate: row.wholesaleRate,
    retailRate: row.retailRate,
    batch: row.batch,
    stock: row.stock,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeProduct(row, barcodeCount) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    barcodeCount: barcodeCount != null ? barcodeCount : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET /api/scanned-products/barcodes/:barcode
// Used right after a scan on the Check Availability screen. Always 200 -
// `found` in the body tells the client whether it's a hit or a miss, same
// contract as Product.getProductByBarcode elsewhere in this codebase.
exports.checkBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const row = await ScannedProductBarcode.findOne({
      where: { barcode },
      include: [{ model: ScannedProduct, as: "product" }],
    });

    if (!row) {
      return res.status(200).json({
        success: true,
        found: false,
        message: "No product found for this barcode",
      });
    }

    const barcodeCount = await ScannedProductBarcode.count({
      where: { scannedProductId: row.scannedProductId },
    });

    res.status(200).json({
      success: true,
      found: true,
      barcode: serializeBarcode(row),
      product: serializeProduct(row.product, barcodeCount),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/scanned-products/search?q=collar
// Name search used while typing a new product name, so the UI can suggest
// "this product already exists - attach a barcode to it instead?" before
// the user even submits the form.
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const where = q && q.trim() ? { name: { [Op.iLike]: `%${q.trim()}%` } } : undefined;
    const rows = await ScannedProduct.findAll({
      where,
      order: [["updatedAt", "DESC"]],
      limit: 20,
      include: [{ model: ScannedProductBarcode, as: "barcodes", attributes: ["id"] }],
    });
    res.status(200).json({
      success: true,
      products: rows.map((r) => serializeProduct(r, (r.barcodes || []).length)),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/scanned-products/:productId
// Full detail view: the product plus every barcode ever generated for it -
// "view all barcodes for this product".
exports.getProductWithBarcodes = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await ScannedProduct.findByPk(productId, {
      include: [{ model: ScannedProductBarcode, as: "barcodes" }],
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const barcodes = (product.barcodes || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map(serializeBarcode);

    res.status(200).json({
      success: true,
      product: serializeProduct(product, barcodes.length),
      barcodes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/scanned-products/barcodes
// { barcode, productName, productId?, category?, unit?, wholesaleRate?,
//   retailRate?, batch?, stock?, notes?, forceNewProduct? }
//
// Resolution order:
//   1. `productId` given -> attach the new barcode straight to that product.
//   2. Otherwise, look for an existing product with the exact same name
//      (case-insensitive). If one exists and `forceNewProduct` was not
//      passed, don't silently merge OR silently duplicate - hand back a
//      `suggestion` so the UI can ask the user which they want.
//   3. Otherwise, create a fresh ScannedProduct and attach the barcode to it.
exports.createBarcodeEntry = async (req, res) => {
  try {
    const {
      barcode,
      productName,
      productId,
      category,
      unit,
      wholesaleRate,
      retailRate,
      batch,
      stock,
      notes,
      forceNewProduct,
    } = req.body;

    if (!barcode || !barcode.trim()) {
      return res.status(400).json({ success: false, message: "Barcode is required" });
    }

    const existingBarcode = await ScannedProductBarcode.findOne({ where: { barcode: barcode.trim() } });
    if (existingBarcode) {
      return res.status(409).json({
        success: false,
        message: "This barcode is already saved",
        barcode: serializeBarcode(existingBarcode),
      });
    }

    let product;

    if (productId) {
      product = await ScannedProduct.findByPk(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Selected product not found" });
      }
    } else {
      if (!productName || !productName.trim()) {
        return res.status(400).json({ success: false, message: "Product name is required" });
      }

      const nameMatch = await ScannedProduct.findOne({
        where: { name: { [Op.iLike]: productName.trim() } },
      });

      if (nameMatch && !forceNewProduct) {
        const barcodeCount = await ScannedProductBarcode.count({
          where: { scannedProductId: nameMatch.id },
        });
        return res.status(200).json({
          success: true,
          suggestion: true,
          message: `A product named "${nameMatch.name}" already exists`,
          existingProduct: serializeProduct(nameMatch, barcodeCount),
        });
      }

      product = await ScannedProduct.create({
        name: productName.trim(),
        category: category || null,
        unit: unit || null,
      });
    }

    const row = await ScannedProductBarcode.create({
      scannedProductId: product.id,
      barcode: barcode.trim(),
      wholesaleRate: wholesaleRate === "" || wholesaleRate == null ? null : wholesaleRate,
      retailRate: retailRate === "" || retailRate == null ? null : retailRate,
      batch: batch || null,
      stock: stock === "" || stock == null ? 0 : stock,
      notes: notes || null,
    });

    const barcodeCount = await ScannedProductBarcode.count({ where: { scannedProductId: product.id } });

    res.status(201).json({
      success: true,
      barcode: serializeBarcode(row),
      product: serializeProduct(product, barcodeCount),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ success: false, message: "This barcode is already saved" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/scanned-products/barcodes/:barcode
// Edits an existing barcode's own rate/batch/stock/notes - does NOT change
// which product it belongs to (re-linking a barcode to a different product
// isn't exposed here to avoid accidental data loss).
exports.updateBarcodeEntry = async (req, res) => {
  try {
    const { barcode } = req.params;
    const row = await ScannedProductBarcode.findOne({ where: { barcode } });
    if (!row) {
      return res.status(404).json({ success: false, message: "Barcode not found" });
    }

    const { wholesaleRate, retailRate, batch, stock, notes } = req.body;
    if (wholesaleRate !== undefined) row.wholesaleRate = wholesaleRate === "" ? null : wholesaleRate;
    if (retailRate !== undefined) row.retailRate = retailRate === "" ? null : retailRate;
    if (batch !== undefined) row.batch = batch;
    if (stock !== undefined) row.stock = stock === "" ? 0 : stock;
    if (notes !== undefined) row.notes = notes;
    await row.save();

    res.status(200).json({ success: true, barcode: serializeBarcode(row) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/scanned-products/barcodes?q=collar
// Flat listing of every saved barcode (with its product name folded in),
// mainly for admin/debug use.
exports.listBarcodeEntries = async (req, res) => {
  try {
    const { q } = req.query;
    const include = [
      {
        model: ScannedProduct,
        as: "product",
        ...(q && q.trim() ? { where: { name: { [Op.iLike]: `%${q.trim()}%` } } } : {}),
      },
    ];
    const rows = await ScannedProductBarcode.findAll({
      include,
      order: [["updatedAt", "DESC"]],
      limit: 100,
    });
    res.status(200).json({
      success: true,
      barcodes: rows.map((r) => ({
        ...serializeBarcode(r),
        productName: r.product ? r.product.name : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
