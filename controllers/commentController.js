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
    if (req.files && req.files.image) {
      image = req.files.image[0].path;
    }
    if (req.files && req.files.file) {
      file = req.files.file[0].path;
    }
    if (file) {
      if (
        file.mimetype === "text/plain" &&
        file.originalname.slice(-4) === ".TXT"
      ) {
        // check if file weight more that 100 kb (100*1024b)

        if (file.size > 100 * 1024) {
          return res
            .status(400)
            .json({ message: "Text file not allow to be bigger that 100kb. " });
        }
      } else {
        return res
          .status(400)
          .json({ message: "You allowed upload only .txt file. " });
      }
    }

    image = image.path;
    if (image) {
      const avatar = await Jimp.read(image);
      console.log(avatar);
      avatar.resize(250, 250).write(image.replace("tmp", "uploads"));

      unlink(image, (err) => {
        if (err) throw err;
      });
    }

    const job = await commentQueue.add({
      userName: escape(userName),
      email: escape(email),
      text: req.body.text,
      image,
      file,
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
