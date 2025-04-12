const { Order, OrderProduct } = require('../models/Order');
const Product = require('../models/Product');
const { Op } = require("sequelize");


// ✅ Create Order (Auto Calculates Total Amount)
// ✅ Create Order (No Transactions, Ignores Stock Availability)
exports.createOrder = async (req, res) => {
    try {
      const { userId, products } = req.body; // No need to send totalAmount

      console.log(req.body);
  
      if (!products || products.length === 0) {
        return res.status(400).json({ success: false, message: "Products are required" });
      }
  
      let totalAmount = 0;
      const validProducts = [];
  
      // Fetch Product Prices
      for (const item of products) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          console.warn(`⚠️ Product not found: ${item.productId}`);
          continue; // Skip invalid product
        }

        // Calculate Total Amount
        totalAmount += product.price * item.quantity;
        validProducts.push({ product, quantity: item.quantity });
      }
  
      if (validProducts.length === 0) {
        return res.status(400).json({ success: false, message: "No valid products in the order" });
      }

      
  
      // Create Order
      const order = await Order.create({ userId, totalAmount });
  
      // Associate Products with Order (Stock not checked)
      for (const { product, quantity } of validProducts) {
        await OrderProduct.create({
          OrderId: order.id,
          ProductId: product.id,
          quantity
        });

            // Reduce stock and update status to "Pending"
            await product.update({
              status: "Pending"
          });

      }
  
      res.status(201).json({ success: true, order });
    } catch (error) {
      console.error("❌ Error in createOrder:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };

// ✅ Get All Orders (With Products)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: {
                model: Product,
                through: { attributes: ["quantity"] },
            },
        });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ✅ Get Order Details with Products
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: {
                model: Product,
                through: { attributes: ["quantity"] },
            },
        });

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.markOrderItemAsReceived = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        // Find the order item
        const orderItem = await OrderProduct.findOne({
            where: { OrderId: orderId, ProductId: itemId }
        });

        if (!orderItem) {
            return res.status(404).json({ success: false, message: "Order item not found" });
        }

        if (orderItem.status === "Delivered") {
            return res.status(400).json({ success: false, message: "Item is already received" });
        }

        // Update item status to Delivered
        await orderItem.update({ status: "Delivered" });
        console.log("here.1.")

        // Update Product status to Delivered
        await Product.update(  { status: "Delivered" }, { where: { id: itemId } });
        
        res.json({ success: true, message: "Order item marked as received, product status updated." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ✅ Get Order Statistics
exports.getOrderStats = async (req, res) => {
    try {
      const totalOrders = await Order.count();
      const pendingOrders = await Order.count({ where: { status: "Pending" } });
      const deliveredOrders = await Order.count({ where: { status: "Delivered" } });
  
      res.json({
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          deliveredOrders,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
