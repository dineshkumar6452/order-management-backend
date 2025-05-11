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
  barcode: {
    type: DataTypes.STRING,
    allowNull: true, // optional, you can change to false if needed
    unique: true     // optional: ensures each barcode is unique
  },
  gst: {
    type: DataTypes.DECIMAL(5, 2), // Stores GST rate as a percentage (e.g., 18.00)
    allowNull: true,
  },
  hsn: {
    type: DataTypes.STRING, // Stores the HSN code for the product
    allowNull: true,
  },
  printName: {
    type: DataTypes.STRING, // Stores the print-friendly name for invoices/receipts
    allowNull: true,
  },rate1: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  rate2: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  rate3: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  rate4: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  }

}, {
  timestamps: true, // Automatically manages createdAt & updatedAt
});


module.exports = Product;
