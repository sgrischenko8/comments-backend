const express = require("express");
const upload = require("../middlewares/multerConfig");
const {
  addComment,
  getComments,
  getCaptcha,
} = require("../controllers/commentController");

const router = express.Router();

router.post("/comments", upload, addComment);
router.get("/comments", getComments);
router.get("/captcha", getCaptcha);

module.exports = router;
