const { Order } = require("../models/Order");
const  Product  = require('../models/Product');

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

exports.getPendingProducts = async (req, res) => {
    try {
        const pendingProducts = await Product.findAll({
            where: { status: "Pending" }
        });

        res.json({ success: true, pendingProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
