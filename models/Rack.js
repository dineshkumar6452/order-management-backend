const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Rack = sequelize.define(
  "Rack",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // The scanned/typed rack barcode or ID - unique so scanning the same
    // rack again resumes it instead of creating a duplicate.
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // Optional friendly label (e.g. "Aisle 3, Shelf B") separate from code.
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true, // updatedAt doubles as "last updated" for this rack
  }
);

module.exports = Rack;
