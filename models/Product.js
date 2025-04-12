const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  category: {
    type: DataTypes.STRING,
  },
  imageUrl: {
    type: DataTypes.STRING, // Stores the uploaded image path
    allowNull: true,
  },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Available", // Can be 'Pending', 'Shipped', 'Received'
    },
}, {
  timestamps: true, // Automatically manages createdAt & updatedAt
});


module.exports = Product;
