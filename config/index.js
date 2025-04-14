const sequelize = require("../config/database");
const Product = require('../models/Product');
const Order = require('../models/Order');


const syncDB = async () => {
  // sequelize.authenticate()
  // .then(() => console.log("✅ Database connected successfully"))
  // .catch(err => console.error("❌ Database connection failed:", err));
  try {
    await sequelize.sync({ force: false }); // Set true to drop & recreate tables
    console.log("✅ Database synced successfully.");

    // Check if there's already a product
    const count = await Product.count();
    if (count < 0) {
      // Create the first product
        const product = await Product.create({
        name: "First Product",
        description: "This is the very first product in the system.",
        price: 19.99,
        stock: 100,
        category: "Starter",
        imageUrl: null,
        barcode: "12345asdfg",
        
      });
      console.log("✅ First product created:");
    }


  } catch (error) {
    console.error("❌ Database sync failed:", error);
  }
};

module.exports = { sequelize, syncDB, Product, Order };
