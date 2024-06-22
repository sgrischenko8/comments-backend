const express = require("express");
const upload = require("../middlewares/multerConfig");
const checkBody = require("../middlewares/checkBody");

const {
  addComment,
  getComments,
  getCaptcha,
} = require("../controllers/commentController");

const router = express.Router();

router.post("/comments", upload, checkBody, addComment);
router.get("/comments", getComments);
router.get("/captcha", getCaptcha);

module.exports = router;
