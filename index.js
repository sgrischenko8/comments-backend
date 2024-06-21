require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sequelize = require("./models/index");
const commentRoutes = require("./routes/commentRoutes");
const validateAndSanitizeHtml = require("./validateAndSanitizeHtml");
const http = require("http");
const app = express();
const { Server } = require("ws");

app.use((req, res, next) => {
  res.setHeader("Content-Disposition", `attachment`);
  next();
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  ,
  process.env.BASE_URL,
];
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

app.use("/uploads", cors(corsOptions), express.static("uploads"));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use("", commentRoutes);

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).json({ message: err.message });
});

// Serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = http.createServer(app);

const wss = new Server(
  (process.env.NODE_ENV = "production" ? { server } : { port: 8080 })
);
wss.on("connection", (socket) => {
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

const PORT = process.env.PORT || 3000;
sequelize
  .sync()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });
