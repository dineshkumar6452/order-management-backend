const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Rack = require("./Rack");
const Product = require("./Product");

// Join table: which products (and how many) sit in which racks. A product
// can appear in many racks, and a rack can hold many products - this is
// what makes that many-to-many relationship queryable (rack contents,
// "where is this product" placement lookups, moving stock between racks).
const RackItem = sequelize.define(
  "RackItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rackId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Racks", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Products", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    // Denormalized for convenience/fast lookup without a join.
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    indexes: [
      // Re-scanning the same product into the same rack should increment
      // quantity on one row, never create a duplicate.
      { unique: true, fields: ["rackId", "productId"] },
    ],
  }
);

Rack.hasMany(RackItem, { foreignKey: "rackId", as: "items", onDelete: "CASCADE" });
RackItem.belongsTo(Rack, { foreignKey: "rackId", as: "rack" });

Product.hasMany(RackItem, { foreignKey: "productId", as: "rackItems", onDelete: "CASCADE" });
RackItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

module.exports = RackItem;
