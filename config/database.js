const { Sequelize } = require("sequelize");
require("dotenv").config();

// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
//   host: process.env.DB_HOST,
//   dialect: process.env.DB_DIALECT,
//   logging: false, // Disable SQL logging
// });


/// - super bas  with IP 4
// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
//   host: process.env.DB_HOST,
//   dialect: process.env.DB_DIALECT, // should be 'postgres'
//   dialectOptions: {
//     ssl: {
//       require: true,
//       rejectUnauthorized: false, // required by Supabase
//     },
//     family: 4, // ✅ Force IPv4 to avoid ENETUNREACH in Render
//   },
//   logging: false, // Disable SQL logging
// });

// Supa base - URI
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    family: 4,
  },
  logging: false,
});

module.exports = sequelize