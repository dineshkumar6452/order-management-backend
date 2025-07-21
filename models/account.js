const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');  // Import sequelize instance

const Account = sequelize.define('Account', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  balance: {
    type: DataTypes.DECIMAL,
    defaultValue: 0,
  },
  contactNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 10], // Ensure exactly 10 digits
      isNumeric: true, // Ensure it’s numeric
    },
  },
}, {
  sequelize,
  modelName: 'Account',
  timestamps: true,
});

module.exports = Account;
