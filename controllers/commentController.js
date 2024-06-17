const { escape } = require("lodash");
const Comment = require("../models/Comment");
const commentQueue = require("../queue");
const validateAndSanitizeHtml = require("../validateAndSanitizeHtml");
const { updateCacheWithNewComments, cache } = require("../utils/cacheUtils");
const { getCommentsWithChildren } = require("../utils/commentUtils");
const EventEmitter = require("events");
const Jimp = require("jimp");
const { unlink } = require("node:fs");

const eventEmitter = new EventEmitter();

// Этот слушатель реагирует на событие завершения обработки комментария
eventEmitter.on("commentProcessed", async (comment) => {
  try {
    await updateCacheWithNewComments();
    console.log("Cache updated with new comments after processing:", comment);
  } catch (error) {
    console.error("Error updating cache with new comments:", error);
  }
});

async function addComment(req, res) {
  try {
    const { userName, email, text, parentId } = req.body;
    if (!userName || !email || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email should be valid" });
    }

    req.body.text = await validateAndSanitizeHtml(text);

    let image = null;
    let file = null;
    // Логируем req.files для отладки
    console.log("req.files:", req.files);

    if (req.files && req.files.image && req.files.image[0]) {
      image = req.files.image[0];
      console.log("Image file:", image);

      // Проверка и изменение размера изображения
      const imagePath = path.resolve(__dirname, "..", image.path);
      const loadedImage = await Jimp.read(imagePath);
      loadedImage.resize(320, 240).write(imagePath);
    } else {
      console.log("No image file uploaded");
    }

    if (req.files && req.files.file && req.files.file[0]) {
      file = req.files.file[0];
      console.log("Text file:", file);

      if (
        file.mimetype === "text/plain" &&
        file.originalname.slice(-4).toUpperCase() === ".TXT"
      ) {
        if (file.size > 100 * 1024) {
          return res.status(400).json({
            message: "Text file not allowed to be bigger than 100kb.",
          });
        }
      } else {
        return res
          .status(400)
          .json({ message: "You are allowed to upload only .txt files." });
      }
    } else {
      console.log("No text file uploaded");
    }
    console.log(file?.path, "========filepath");
    console.log(image?.path, "========imagepath");

    const job = await commentQueue.add({
      userName: escape(userName),
      email: escape(email),
      text: req.body.text,
      image: image?.path | "",
      file: file?.path | "",
      image: image.path,
      file: file.path,
      parentId,
    });

    // Ожидаем завершения задания и получение данных нового комментария
    const result = await job.finished();
    console.log("Comment processing result:", result);

    // Генерируем событие, что комментарий был успешно обработан
    eventEmitter.emit("commentProcessed", result);

    res.status(201).json({
      message: "Comment added to queue for processing",
      comment: result,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getComments(req, res) {
  const {
    sortBy = "createdAt",
    sortOrder = "DESC",
    page = 1,
    limit = 3,
  } = req.query;
  const allowedSortFields = ["userName", "email", "createdAt"];
  if (!allowedSortFields.includes(sortBy)) {
    return res.status(400).json({ error: "Invalid sort field" });
  }

  const allowedSortOrders = ["ASC", "DESC"];
  if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
    return res.status(400).json({ error: "Invalid sort order" });
  }

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const offset = (pageNumber - 1) * limitNumber;

  try {
    let comments = [];
    if (
      pageNumber === 1 &&
      sortBy === "createdAt" &&
      sortOrder.toUpperCase() === "DESC"
    ) {
      comments = cache.get("latestComments");
    }

    if (!comments || comments.length === 0) {
      comments = await getCommentsWithChildren(
        sortBy,
        sortOrder,
        limitNumber,
        offset
      );
      if (
        pageNumber === 1 &&
        sortBy === "createdAt" &&
        sortOrder.toUpperCase() === "DESC"
      ) {
        cache.set("latestComments", comments);
      }
    }

    res.status(200).json({
      totalItems: comments.length,
      totalPages: Math.ceil(comments.length / limitNumber),
      currentPage: pageNumber,
      comments: comments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
}

module.exports = { addComment, getComments };
