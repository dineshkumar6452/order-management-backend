const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// The "product identity" side of the Check-Availability feature's own
// storage - kept separate from the main Product catalog (per the earlier
// "Dont add product in database" instruction).
//
// One ScannedProduct can have MANY ScannedProductBarcode rows (see that
// model) - e.g. "COLLAR" generated with barcode A at one rate, then again
// months later with barcode B at a different rate/batch. Both barcodes
// point back to this single ScannedProduct row, so the name/category is
// only ever typed once and every barcode for "COLLAR" is easy to find.
const ScannedProduct = sequelize.define(
  "ScannedProduct",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "scanned_products",
    timestamps: true,
  }
);

module.exports = ScannedProduct;
