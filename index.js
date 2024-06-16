const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sequelize = require("./models/index");
const Person = require("./models/Person");
const Comment = require("./models/Comment");
const { escape } = require("lodash");
const multer = require("multer");
const path = require("path");
const validateAndSanitizeHtml = require("./validateAndSanitizeHtml.js");
const commentQueue = require("./queue");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Настройка multer для сохранения файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Директория для сохранения файлов
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Генерация уникального имени файла
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Фильтрация файлов по расширениям
    const filetypes = /\.(jpeg|jpg|png|gif|txt)$/i;
    const extname = filetypes.test(path.extname(file.originalname));

    console.log(`File: ${file.originalname}, Extname: ${extname}`);

    if (extname) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Allowed file types are jpeg, jpg, png, gif for images and txt for text files."
        )
      );
    }
  },
  // limits: {
  //   fileSize: 100 * 1024, // Максимальный размер файла в байтах (100 КБ)
  // },
}).fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

// Додати нового користувача
app.post("/people", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const newPerson = await Person.create({ name });
    res.status(201).json(newPerson);
  } catch (error) {
    console.error("Error creating person:", error);
    res.status(500).json({ error: "Failed to create person" });
  }
});

// Показати всіх користувачів
app.get("/people", async (req, res) => {
  console.log("GET /people");
  try {
    const people = await Person.findOne();
    res.status(200).json(people);
  } catch (error) {
    console.error("Error fetching people:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// Додати новий коментар
app.post("/comments", upload, async (req, res) => {
  try {
    const { userName, email, text, parentId } = req.body;
    console.log(userName, email, text, parentId, "------------------------");

    if (!userName || !email || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email should be valid" });
    }

    // Проверка и очистка HTML-кода
    try {
      req.body.text = await validateAndSanitizeHtml(text);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    let image = null;
    let file = null;
    console.log(req.files);
    if (req.files && req.files.image) {
      image = req.files.image[0].path; // Сохраняем путь к изображению
    }
    if (req.files && req.files.file) {
      file = req.files.file[0].path; // Сохраняем путь к текстовому файлу
    }

    // Добавление комментария в базу данных
    // const newComment = await Comment.create({
    //   userName: escape(userName),
    //   email: escape(email),
    //   text: req.body.text,
    //   image, // Путь к изображению
    //   file, // Путь к текстовому файлу
    //   parentId,
    // });

    // Добавление комментария в очередь для асинхронной обработки
    const job = await commentQueue.add({
      // id: newComment.id, // Передаем ID только что добавленного комментария
      userName: escape(userName),
      email: escape(email),
      text: req.body.text,
      image, // Путь к изображению
      file, // Путь к текстовому файлу
      parentId,
    });

    res.status(201).json({
      message: "Comment added to queue for processing",
      comment: {
        id: job.id,
        userName: escape(userName),
        email: escape(email),
        text: req.body.text,
        image,
        file,
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(400).json({ error: "Failed to create comment" });
  }
});

// Отримати коментарі з можливістю сортування та пагінації
app.get("/comments", async (req, res) => {
  const {
    sortBy = "createdAt",
    sortOrder = "DESC",
    page = 1,
    limit = 3,
  } = req.query; // За замовчуванням сортування по createdAt в порядку DESC (LIFO)

  // Перевірка на допустимі поля сортування
  const allowedSortFields = ["userName", "email", "createdAt"];
  if (!allowedSortFields.includes(sortBy)) {
    return res.status(400).json({ error: "Invalid sort field" });
  }

  // Перевірка на допустимі порядки сортування
  const allowedSortOrders = ["ASC", "DESC"];
  if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
    return res.status(400).json({ error: "Invalid sort order" });
  }

  // Параметри пагінації
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const offset = (pageNumber - 1) * limitNumber;

  try {
    const { count, rows: topComments } = await Comment.findAndCountAll({
      where: { parentId: null },
      order: [[sortBy, sortOrder.toUpperCase()]], // Додаємо сортування
      limit: limitNumber,
      offset: offset,
    });

    // Получаем все комментарии для построения дерева
    const allComments = await Comment.findAll({
      order: [[sortBy, sortOrder.toUpperCase()]], // Додаємо сортування
    });

    // Функция для построения дерева комментариев
    const buildCommentTree = (comments, parentId = null) => {
      return comments
        .filter((comment) => comment.parentId === parentId)
        .map((comment) => {
          const children = buildCommentTree(comments, comment.id);
          return { ...comment.toJSON(), Children: children };
        });
    };

    // Строим дерево только для верхнеуровневых комментариев с учетом пагинации
    const commentTree = topComments.map((comment) => {
      const children = buildCommentTree(allComments, comment.id);
      return { ...comment.toJSON(), Children: children };
    });

    // const commentTree = buildCommentTree(allComments);

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      comments: commentTree,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// // Показати всі коментарі
// app.get("/comments", async (req, res) => {
//   try {
//     const comment = await Comment.findAll();
//     res.status(200).json(comment);
//   } catch (error) {
//     console.error("Error fetching comment:", error);
//     res.status(500).json({ error: "Failed to fetch comment" });
//   }
// });

const PORT = process.env.PORT || 3000;
sequelize
  .sync()
  .then(() => {
    console.log("Database synchronized");
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });
