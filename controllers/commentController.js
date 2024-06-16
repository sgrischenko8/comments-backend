const { escape } = require("lodash");
const Comment = require("../models/Comment");
const commentQueue = require("../queue");
const validateAndSanitizeHtml = require("../validateAndSanitizeHtml");
const { updateCacheWithNewComments, cache } = require("../utils/cacheUtils");

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

    // console.log("trrrrrrrrrr:__________________", job);
    await updateCacheWithNewComments();

    res.status(201).json({
      message: "Comment added to queue for processing",
      comment: result,

      //     {
      //     id: job.id,
      //     userName: escape(userName),
      //     email: escape(email),
      //     text: req.body.text,
      //     image,
      //     file,
      //     parentId,
      //     createdAt: new Date().toISOString(),
      //   },
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(400).json({ error: "Failed to create comment" });
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
      // const pageNumber = parseInt(page);
      // const limitNumber = parseInt(limit);
      // const offset = (pageNumber - 1) * limitNumber;

      const { count, rows: topComments } = await Comment.findAndCountAll({
        where: { parentId: null },
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: limitNumber,
        offset: offset,
      });

      const allComments = await Comment.findAll({
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      const buildCommentTree = (comments, parentId = null) => {
        return comments
          .filter((comment) => comment.parentId === parentId)
          .map((comment) => {
            const children = buildCommentTree(allComments, comment.id);
            return { ...comment.toJSON(), Children: children };
          });
      };

      const commentTree = topComments.map((comment) => {
        const children = buildCommentTree(allComments, comment.id);
        return { ...comment.toJSON(), Children: children };
      });

      comments = commentTree;

      if (
        pageNumber === 1 &&
        sortBy === "createdAt" &&
        sortOrder.toUpperCase() === "DESC"
      ) {
        cache.set("latestComments", commentTree);
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
