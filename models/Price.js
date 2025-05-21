const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Price = sequelize.define("Price", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Products",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  rate1: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  rate2: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  rate3: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  rate4: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

// 👇 Association back to Product
Price.associate = (models) => {
  Price.belongsTo(models.Product, { foreignKey: "productId" });
};



module.exports = Price;
