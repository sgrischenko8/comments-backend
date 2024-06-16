// models/Comment.js
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
      type: DataTypes.STRING, // Хранение пути к файлу изображения
      allowNull: true,
    },
    file: {
      type: DataTypes.STRING, // Хранение пути к текстовому файлу
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Comments", // Модель, на которую ссылается внешний ключ
        key: "id",
      },
      onDelete: "CASCADE", // При удалении родительского комментария удаляются и дочерние
      onUpdate: "CASCADE", // При обновлении родительского комментария обновляются и дочерние
    },
  },
  {
    sequelize,
    modelName: "Comment",
    tableName: "Comments",
    timestamps: true,
  }
);

Comment.hasMany(Comment, {
  as: "Children",
  foreignKey: "parentId",
  useJunctionTable: false,
});
Comment.belongsTo(Comment, {
  as: "Parent",
  foreignKey: "parentId",
  useJunctionTable: false,
});

module.exports = Comment;
