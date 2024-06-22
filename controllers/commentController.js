const { escape } = require("lodash");
const svgCaptcha = require("svg-captcha");
const { signCaptcha } = require("../utils/jwtService");
const Comment = require("../models/Comment");
const commentQueue = require("../queue");
const validateAndSanitizeHtml = require("../validateAndSanitizeHtml");
const { updateCacheWithNewComments, cache } = require("../utils/cacheUtils");
const { getCommentsWithChildren } = require("../utils/commentUtils");
const EventEmitter = require("events");

const limit = 25;

const eventEmitter = new EventEmitter();

eventEmitter.on("commentProcessed", () => {
  try {
    updateCacheWithNewComments();
  } catch (error) {
    console.error("Error updating cache with new comments:", error);
  }
});

async function addComment(req, res) {
  try {
    const {
      userName,
      email,
      text,
      parentId,
      sortBy = "createdAt",
      sortOrder = "DESC",
      page = 1,
    } = req.body;

    req.body.text = await validateAndSanitizeHtml(text);

    let image = null;
    let file = null;

    const job = await commentQueue.add({
      userName: escape(userName),
      email: escape(email),
      text: req.body.text,
      image: image ? image.path : "",
      file: file ? file.path : "",
      parentId,
    });

    // wait for saving doc and get new comment
    const result = await job.finished();

    const comments = await getCommentsWithChildren(
      sortBy,
      sortOrder,
      limit,
      (+page - 1) * limit
    );

    const totalItems = await Comment.count({
      where: {
        parentId: null,
      },
    });

    res.status(201).json({
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      comments,
    });

    eventEmitter.emit("commentProcessed", result);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getComments(req, res) {
  const { sortBy = "createdAt", sortOrder = "DESC", page = 1 } = req.query;

  const allowedSortFields = ["userName", "email", "createdAt"];
  if (!allowedSortFields.includes(sortBy)) {
    return res.status(400).json({ error: "Invalid sort field" });
  }

  const allowedSortOrders = ["ASC", "DESC"];
  if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
    return res.status(400).json({ error: "Invalid sort order" });
  }

  const pageNumber = parseInt(page);
  const offset = (pageNumber - 1) * limit;

  const isDefaultQuery =
    pageNumber === 1 &&
    sortBy === "createdAt" &&
    sortOrder.toUpperCase() === "DESC";

  try {
    let comments = [];
    if (isDefaultQuery) {
      comments = cache.get("latestComments");
    }

    if (!comments || comments.length === 0) {
      comments = await getCommentsWithChildren(
        sortBy,
        sortOrder,
        limit,
        offset
      );
      if (isDefaultQuery) {
        cache.set("latestComments", comments);
      }
    }

    const totalItems = await Comment.count({
      where: {
        parentId: null,
      },
    });

    res.status(200).json({
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: pageNumber,
      comments: comments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
}

async function getCaptcha(req, res) {
  const captcha = svgCaptcha.create({
    size: 6, // Number of characters in the captcha
    ignoreChars: "0o1i", // Characters to exclude
    noise: 2, // Number of noise lines
    color: true, // Use colored text
    background: "#cc9966", // Background color
  });

  res.cookie("captcha", signCaptcha(captcha.text), {
    httpOnly: process.env.NODE_ENV === "development" ? true : false,
    sameSite: "None",
    secure: true,
  });

  res.type("svg");
  res.status(200).send(captcha.data);
}

module.exports = { addComment, getComments, getCaptcha };
