const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Price = require("./Price"); // Import Price model for association

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
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  category: {
    type: DataTypes.STRING,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "Available",
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  gst: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  hsn: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  printName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

// 👇 Setup association
Product.hasMany(Price, { foreignKey: "productId", as: "Prices", onDelete: "CASCADE" });

module.exports = Product;
