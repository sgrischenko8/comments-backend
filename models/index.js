// models/index.js
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("mydatabase", "myuser", "mypassword", {
  host: "localhost",
  dialect: "mysql",
  port: 3306, // порт MySQL
  define: {
    timestamps: true, // опционально, если вам нужны временные метки
    createdAt: "createdAt", // если нужно настраивать название поля для createdAt
    updatedAt: false, // если не нужно использовать updatedAt
  },
});

// const sequelize = new Sequelize({
//   dialect: "sqlite",
//   storage: "./database.sqlite", // Путь к файлу базы данных
// });

module.exports = sequelize;
