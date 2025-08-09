// models/Todo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Import sequelize instance

const Todo = sequelize.define('Todo', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  priority: {
   type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Relationships
  relatedAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  relatedOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Ownership & lifecycle tracking
  createdBy: {
    type: DataTypes.TEXT, // user ID
    allowNull: false,
  },
  currentOwner: {
    type: DataTypes.TEXT, // user ID
    allowNull: false,
  },
  closedBy: {
    type: DataTypes.TEXT, // user ID
    allowNull: true,
  },

  // Finalization details
  closingComment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  closingDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Todo',
  tableName: 'todos',
  timestamps: true, // createdAt & updatedAt automatically
});

module.exports = Todo;
