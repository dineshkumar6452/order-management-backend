const Product = require("../models/Product");

// ✅ Create Product
exports.createProduct = async (req, res) => {
  try {
    const imageUrl = req.file ? `${process.env.LOCALHOST}/uploads/${req.file.filename}` : null;

    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      stock: req.body.stock,
      category: req.body.category,
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

// ✅ Update Product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : product.imageUrl;

    await product.update({
      name: req.body.name || product.name,
      description: req.body.description || product.description,
      price: req.body.price || product.price,
      stock: req.body.stock || product.stock,
      status: req.body.status || product.status,
      category: req.body.category || product.category,
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
