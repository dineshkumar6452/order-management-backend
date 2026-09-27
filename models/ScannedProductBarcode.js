const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const ScannedProduct = require("./ScannedProduct");

// One row per physical barcode. `barcode` is globally unique (a barcode can
// only ever mean one thing), but many rows can share the same
// `scannedProductId` - that's how "one product, multiple barcodes" is
// modeled: each batch/rate gets its own barcode row, all linked to the same
// ScannedProduct.
const ScannedProductBarcode = sequelize.define(
  "ScannedProductBarcode",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    scannedProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    wholesaleRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    retailRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    batch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "scanned_product_barcodes",
    timestamps: true,
  }
);

ScannedProduct.hasMany(ScannedProductBarcode, {
  foreignKey: "scannedProductId",
  as: "barcodes",
  onDelete: "CASCADE",
});
ScannedProductBarcode.belongsTo(ScannedProduct, {
  foreignKey: "scannedProductId",
  as: "product",
});

module.exports = ScannedProductBarcode;
