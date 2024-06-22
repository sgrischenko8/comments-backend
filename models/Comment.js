const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const Comment = sequelize.define(
  "Comment",
  {
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
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Comments",
        key: "id",
      },
      onUpdate: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "Comment",
    tableName: "Comments",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
  }
);

Comment.hasMany(Comment, {
  as: "children",
  foreignKey: "parentId",
  useJunctionTable: false,
});
Comment.belongsTo(Comment, {
  as: "parent",
  foreignKey: "parentId",
  useJunctionTable: false,
});

module.exports = Comment;
