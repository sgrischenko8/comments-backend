require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");
// const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sequelize = require("./models/index");
// const initializeDatabase = require("./models/initializeDatabase");
// const helmet = require("helmet");
const commentRoutes = require("./routes/commentRoutes");
// const personRoutes = require("./routes/personRoutes");
const server = express();
const { Server } = require("ws");

server.use((req, res, next) => {
  res.setHeader("Content-Disposition", `attachment`);
  next();
});

const allowedOrigins = ["http://localhost:5173", process.env.BASE_URL];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// const corsOptions = {
//   origin:
//     process.env.NODE_ENV === "development"
//       ? "http://localhost:5173"
//       : process.env.BASE_URL,
//   credentials: true,
// };

// app.use(helmet());
server.use("/uploads", cors(corsOptions), express.static("uploads"));
server.use(express.static("public"));
server.use(bodyParser.json());
server.use(cookieParser());
server.use(express.urlencoded({ extended: true }));
server.use(cors(corsOptions));
server.use("", commentRoutes);

server.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).json({ message: err.message });
});

const INDEX = "/index.html";
const PORT = process.env.PORT || 3000;
sequelize
  .sync()
  .then(() => {
    server
      .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
      .listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

const wss = new Server({ server });

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
