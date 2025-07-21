const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Account = require('./account');

const Transaction = sequelize.define('Transaction', {
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['credit', 'debit']],
    },
  },
  amount: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
  },
  // Optional common fields
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.STRING,
  },
  updatedBy: {
    type: DataTypes.STRING,
  },
  metaTag: {
    type: DataTypes.STRING,
  },
}, {
  sequelize,
  modelName: 'Transaction',
  timestamps: true,
});

// Define association
Transaction.belongsTo(Account, {
  foreignKey: 'accountId',
  as: 'account',
  onDelete: 'CASCADE', // Optional: deletes transactions if account is deleted
});

module.exports = Transaction;
