const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Product = require("./Product");

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("Pending", "Shipped", "Delivered", "Cancelled"),
    defaultValue: "Pending",
  },
}, {
  timestamps: true, // Adds createdAt & updatedAt fields
});

// Many-to-Many Relationship
const OrderProduct = sequelize.define("OrderProduct", {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },  status: {  
    type: DataTypes.ENUM("Pending", "Shipped", "Delivered"),  
    defaultValue: "Pending",  
  },
});

Order.belongsToMany(Product, { through: OrderProduct });
Product.belongsToMany(Order, { through: OrderProduct });

module.exports = { Order, OrderProduct };
