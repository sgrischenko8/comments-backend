const { escape } = require("lodash");
const Comment = require("../models/Comment");
const commentQueue = require("../queue");
const validateAndSanitizeHtml = require("../validateAndSanitizeHtml");
const { updateCacheWithNewComments, cache } = require("../utils/cacheUtils");
const { getCommentsWithChildren } = require("../utils/commentUtils");
const EventEmitter = require("events");

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
    const { userName, email, text } = req.body;

    // Проверяем, что все необходимые данные присутствуют
    if (!userName || !email || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const comment = await Comment.create({ userName, email, text });
    res.status(201).json(comment);
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
