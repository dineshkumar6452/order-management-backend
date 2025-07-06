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

  // ✅ New fields
  rateQty: {
    type: DataTypes.STRING, // e.g., "12 PC"
    allowNull: true,
  },
  packingSize: {
    type: DataTypes.INTEGER, // number of pcs in the actual pack
    allowNull: true,
  },
  specialBarcodeRate: {
    type: DataTypes.DECIMAL(10, 2), // auto-calculated if not provided
    allowNull: true,
  },
  isSpecialBarcodeRate: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
},
}, {
  timestamps: true,
});

Price.associate = (models) => {
  Price.belongsTo(models.Product, { foreignKey: "productId" });
};

module.exports = Price;
