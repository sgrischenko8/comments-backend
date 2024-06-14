// models/Person.js
const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const Person = sequelize.define("Person", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Person;
