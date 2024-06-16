require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sequelize = require("./models/index");
const commentRoutes = require("./routes/commentRoutes");
const personRoutes = require("./routes/personRoutes");

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use("/comments", commentRoutes);
app.use("/people", personRoutes);

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
