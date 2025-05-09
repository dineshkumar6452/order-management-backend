const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");

// ✅ Create Product
exports.createProduct = async (req, res) => {
  try {


        // // Check for existing barcode
        // const existingProduct = await Product.findOne({ where: { barcode } });
        // if (existingProduct) {
        //   return res.status(400).json({ success: false, message: "Product with this barcode already exists" });
        // }

    const imageUrl = req.file ? `${process.env.LOCALHOST}/uploads/${req.file.filename}` : null;

    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      stock: req.body.stock,
      category: req.body.category,
      barcode: req.body.barcode,
      imageUrl: imageUrl,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get All Products
exports.getAllProducts = async (req, res) => {
  console.log("📌 Fetching All Products...");
  try {
    const products = await Product.findAll();

    res.json({ success: true, products });
  } catch (error) {
    console.error("❌ Error in getAllProducts:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      console.warn("⚠️ Product not found for ID:", req.params.id);
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error("❌ Error in getProductById:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
// ✅ Get Product by Barcode
exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ where: { barcode } });

    if (!product) {
      return res.status(200).json({ success: false, message: "Product not found with this barcode" });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error("❌ Error in getProductByBarcode:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Update Product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // const { barcode } = req.body;
    // if (barcode && barcode !== product.barcode) {
    //   const existing = await Product.findOne({ where: { barcode } });
    //   if (existing) {
    //     return res.status(400).json({ success: false, message: "Barcode already exists" });
    //   }
    // }

    const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : product.imageUrl;

    await product.update({
      name: req.body.name || product.name,
      description: req.body.description || product.description,
      price: req.body.price || product.price,
      stock: req.body.stock || product.stock,
      status: req.body.status || product.status,
      category: req.body.category || product.category,
      barcode: req.body.barcode || product.barcode,
      imageUrl: imageUrl,
    });

    const Updatedproduct = await Product.findByPk(req.params.id);

    res.json({ success: true, message: "Product updated successfully", Updatedproduct });
  } catch (error) {
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
    const products = await Product.findAll();

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "No products found" });
    }

    // Format only necessary fields
    const formattedProducts = products.map(product => ({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      barcode: product.barcode,
      imageUrl: product.imageUrl
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

