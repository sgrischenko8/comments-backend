const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sequelize = require("./models/index");
const Person = require("./models/Person");
const Comment = require("./models/Comment");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// const RECAPTCHA_SECRET_KEY = "6Ldmw_gpAAAAAPDvhLTEQ78lBn8DGCJ4J4FFVK97";

// Додати нового користувача
app.post("/people", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const newPerson = await Person.create({ name });
    res.status(201).json(newPerson);
  } catch (error) {
    console.error("Error creating person:", error);
    res.status(500).json({ error: "Failed to create person" });
  }
});

// Показати всіх користувачів
app.get("/people", async (req, res) => {
  console.log("GET /people");
  try {
    const people = await Person.findAll();
    res.status(200).json(people);
  } catch (error) {
    console.error("Error fetching people:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// Додати новий коментар
app.post("/comments", async (req, res) => {
  try {
    const { userName, email, text, parentId } = req.body;
    if (!userName || !email || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // const captchaResponse = await axios.post(
    //   `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
    // );
    // if (!captchaResponse.data.success) {
    //   return res.status(400).json({ error: "Failed captcha verification" });
    // }

    const newComment = await Comment.create({
      userName,
      email,
      text,
      parentId,
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Показати всі коментарі
app.get("/comments", async (req, res) => {
  try {
    const comment = await Comment.findAll();
    res.status(200).json(comment);
  } catch (error) {
    console.error("Error fetching comment:", error);
    res.status(500).json({ error: "Failed to fetch comment" });
  }
});

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
