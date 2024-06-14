// models/Comment.js
const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const Comment = sequelize.define("Comment", {
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isAlphanumeric: true,
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

Comment.hasMany(Comment, { as: "Children", foreignKey: "parentId" });
Comment.belongsTo(Comment, { as: "Parent", foreignKey: "parentId" });

module.exports = Comment;
