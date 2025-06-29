const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  subCategory: {
    type: DataTypes.STRING,
    allowNull: true
  },

  hsn: {
    type: DataTypes.STRING,
    allowNull: true
  },

  gst: {
    type: DataTypes.FLOAT,
    allowNull: true
  },

  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },

  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },

  metaTag: {
    type: DataTypes.STRING,
    allowNull: true
  }

}, {
  tableName: 'categories',
  timestamps: true
});

// Auto-uppercase name
Category.beforeValidate((category) => {
  if (category.name) {
    category.name = category.name.toUpperCase();
  }
});

// Optional association
Category.associate = (models) => {
  if (models.Product) {
    Category.hasMany(models.Product, {
      foreignKey: 'categoryId',
      as: 'products',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
};

module.exports = Category;
