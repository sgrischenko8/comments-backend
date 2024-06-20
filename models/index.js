// models/index.js
const { Sequelize } = require("sequelize");

// const sequelize = new Sequelize("mydatabase", "myuser", "mypassword", {
//   host: "localhost",
//   dialect: "mysql",
//   define: {
//     timestamps: true,
//     createdAt: "createdAt",
//     updatedAt: false,
//   },
// });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  define: {
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
  },
});

module.exports = sequelize;
