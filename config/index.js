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
  } catch (error) {
    console.error("❌ Database sync failed:", error);
  }

};

module.exports = { sequelize, syncDB, Product,Order };
