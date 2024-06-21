const { escape } = require("lodash");
const svgCaptcha = require("svg-captcha");
const { signCaptcha, extractCaptcha } = require("../utils/jwtService");
const Comment = require("../models/Comment");
const commentQueue = require("../queue");
const validateAndSanitizeHtml = require("../validateAndSanitizeHtml");
const { updateCacheWithNewComments, cache } = require("../utils/cacheUtils");
const { getCommentsWithChildren } = require("../utils/commentUtils");
const EventEmitter = require("events");
const Jimp = require("jimp");
const path = require("path");

const WebSocket = require("ws");

const http = require("http");
// const server = new WebSocket.Server({ port: 8080 });
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const limit = 25;

wss.on("connection", (socket) => {
  console.log("A new client connected!");

  // Send a message to the client
  socket.send("Welcome to the WebSocket server!");

  // Handle incoming messages from the client
  socket.on("message", async (message) => {
    console.log(`Received message: ${message}`);

    const modifiedMessage = message.toString("utf8");
    try {
      const validatedHtml = await validateAndSanitizeHtml(modifiedMessage);
      socket.send(validatedHtml);
    } catch (error) {
      console.log(error);
      socket.send(error.toString());
    }
  });

  // Handle client disconnect
  socket.on("close", () => {
    console.log("Client disconnected");
  });
});

const eventEmitter = new EventEmitter();

// Этот слушатель реагирует на событие завершения обработки комментария
eventEmitter.on("commentProcessed", () => {
  try {
    updateCacheWithNewComments();
    // console.log("Cache updated with new comments after processing:");
  } catch (error) {
    console.error("Error updating cache with new comments:", error);
  }
});

async function addComment(req, res) {
  const { captcha: cryptedCaptcha } = req.cookies;
  try {
    const {
      userName,
      email,
      text,
      parentId,
      captcha,
      sortBy = "createdAt",
      sortOrder = "DESC",
      page = 1,
    } = req.body;
    console.log(req.cookies, "=======crypted captcha");

    if (!userName || !email || !text || !cryptedCaptcha) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (extractCaptcha(cryptedCaptcha) !== captcha) {
      return res.status(400).json({ error: "Invalid CAPTCHA" });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email should be valid" });
    }

    req.body.text = await validateAndSanitizeHtml(text);

    let image = null;
    let file = null;

    if (req.files && req.files.image) {
      if (req.files.image[0]) {
        image = req.files.image[0];

        // Проверка и изменение размера изображения
        const imagePath = path.resolve(__dirname, "..", image.path);
        const loadedImage = await Jimp.read(imagePath);
        loadedImage.contain(
          320,
          240,
          Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE,
          (err, image) => {
            if (err) {
              console.error("Error processing image:", err);
              return res.status(500).json({
                message: "Error processing image",
              });
            }

            image.write(imagePath, (err) => {
              if (err) {
                console.error("Error saving image:", err);
                return res.status(500).json({
                  message: "Error saving image",
                });
              }
            });
          }
        );
      } else {
        return res.status(400).json({
          message: "No image file uploaded",
        });
      }
    }

    if (req.files && req.files.file) {
      if (req.files.file[0]) {
        file = req.files.file[0];
        console.log(file.path, "file path-------");
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
        return res.status(400).json({
          message: "No text file uploaded",
        });
      }
    }
    let date = Date.now();
    const job = await commentQueue.add({
      userName: escape(userName),
      email: escape(email),
      text: req.body.text,
      image: image ? image.path : "",
      file: file ? file.path : "",
      parentId,
    });
    console.log("after queue", Date.now() - date);
    date = Date.now();

    // Ожидаем завершения задания и получение данных нового комментария
    const result = await job.finished();

    console.log("after job", Date.now() - date);
    date = Date.now();

    const comments = await getCommentsWithChildren(
      sortBy,
      sortOrder,
      limit,
      (+page - 1) * limit
    );
    console.log("after getNewCom", Date.now() - date);
    date = Date.now();

    const totalItems = await Comment.count({
      where: {
        parentId: null,
      },
    });

    console.log("after count", Date.now() - date);

    res.status(201).json({
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      comments,
    });

    // Генерируем событие, что комментарий был успешно обработан
    eventEmitter.emit("commentProcessed", result);
    console.log("after emit", Date.now() - date);
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
    secure: process.env.NODE_ENV === "development" ? false : true,
  });

  res.type("svg");
  res.status(200).send(captcha.data);
}

module.exports = { addComment, getComments, getCaptcha };
