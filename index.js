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

const app = express();

// app.use((req, res, next) => {
//   res.setHeader("Content-Disposition", `attachment`); // Example of a custom header
//   next();
// });

const corsOptions = {
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : process.env.BASE_URL,
  credentials: true,
};

// app.use(helmet());
app.use("/uploads", cors(corsOptions), express.static("uploads"));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use("", commentRoutes);

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).json({ message: err.message });
});

const PORT = process.env.PORT || 3000;
sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });
