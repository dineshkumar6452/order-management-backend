const Product = require("../models/Product");
const Price = require("../models/Price");
const fs = require("fs");
const path = require("path");

// ✅ Create Product with Prices
exports.createProduct = async (req, res) => {
  try {
    const imageUrl = req.file ? `${process.env.LOCALHOST}/uploads/${req.file.filename}` : null;

    const product = await Product.create({
      name: req.body.name,
      stock: req.body.stock,
      category: req.body.category,
      barcode: req.body.barcode,
      imageUrl: imageUrl,
      gst: req.body.gst,
      hsn: req.body.hsn,
      printName: req.body.printName,
    });

    // If prices array is provided
    if (Array.isArray(req.body.prices)) {
      const pricesToCreate = req.body.prices.map((price) => ({
        ...price,
        productId: product.id,
      }));
      await Price.bulkCreate(pricesToCreate);
    }

    const productWithPrices = await Product.findByPk(product.id, {
      include: [{ model: Price, as: "Prices" }],
    });

    res.status(201).json({ success: true, product: productWithPrices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Price, as: "Prices", attributes: { exclude: ["productId", "updatedAt"] } }],
    });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Price, as: "Prices", attributes: { exclude: ["productId", "updatedAt"] } }],
    });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({
      where: { barcode },
      include: [{ model: Price, as: "Prices", attributes: { exclude: ["productId", "updatedAt"] } }],
    });
    if (!product) {
      return res.status(200).json({ success: false, message: "Product not found with this barcode" });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



// ✅ Update Product
exports.updateProduct = async (req, res) => {
  try {
    // Find product by ID
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Determine image URL (new upload or existing)
    const imageUrl = req.file ? `${process.env.LOCALHOST}/uploads/${req.file.filename}` : product.imageUrl;

    // Update main product fields
    await product.update({
      name: req.body.name || product.name,
      stock: req.body.stock || product.stock,
      status: req.body.status || product.status,
      category: req.body.category || product.category,
      barcode: req.body.barcode || product.barcode,
      imageUrl,
      gst: req.body.gst || product.gst,
      hsn: req.body.hsn || product.hsn,
      printName: req.body.printName || product.printName,
    });

    // Sync product prices if provided
    if (Array.isArray(req.body.prices)) {
      const validKeys = [];

      for (const priceData of req.body.prices) {
        if (priceData.id) {
          // Try updating existing price by id
          const [updatedCount] = await Price.update(priceData, {
            where: {
              id: priceData.id,
              productId: product.id,
            },
          });

          if (updatedCount > 0) {
            validKeys.push(priceData.id);
            continue;
          }
        }

        // Create new price if update did not happen
        const created = await Price.create({ ...priceData, productId: product.id });
        validKeys.push(created.id);
      }

      // Find existing prices for the product
      const existingPrices = await Price.findAll({ where: { productId: product.id } });

      // Delete prices not present in the new price list
      for (const existing of existingPrices) {
        if (!validKeys.includes(existing.id)) {
          await existing.destroy();
        }
      }
    }

    // Fetch updated product with prices
    const updatedProduct = await Product.findByPk(req.params.id, {
      include: [{ model: Price, as: "Prices" }],
    });

    // Return success response with updated product info
    res.json({ success: true, message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("❌ Update failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.destroy({ where: { id: req.params.id } });
    if (!deletedProduct) {
      console.warn("⚠️ Product not found for deletion, ID:", req.params.id);
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ Error in deleteProduct:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Bulk Import Products
exports.bulkCreateProducts = async (req, res) => {
  try {
    const products = req.body.products; // Assuming the request contains an array of product objects

    console.log(products);

    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, message: "Products should be an array" });
    }

    const newProducts = await Product.bulkCreate(products);

    res.status(201).json({ success: true, products: newProducts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Bulk Exports Products
exports.exportProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Price, as: "Prices", attributes: { exclude: ["productId", "createdAt", "updatedAt"] } }],
    });

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "No products found" });
    }

    // Format only necessary fields
    const formattedProducts = products.map(product => ({
      name: product.name,
      stock: product.stock,
      category: product.category,
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      gst: product.gst,
      hsn: product.hsn,
      printName: product.printName,
      prices: product.Prices || [],
    }));


    const exportData = { products: formattedProducts };

    const filePath = path.join(__dirname, "../exports/products.json");

    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write JSON file
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    // Send file for download
    res.download(filePath, "products.json", (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
      } else {
        fs.unlinkSync(filePath); // Optional cleanup
      }
    });

  } catch (error) {
    console.error("❌ Error exporting products:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.deletePriceById = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Price.destroy({
      where: { id },
    });

    if (deleted === 0) {
      return res.status(404).json({ success: false, message: "Price not found" });
    }

    res.json({ success: true, message: "Price deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
