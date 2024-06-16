const express = require("express");
const upload = require("../middlewares/multerConfig");
const { addComment, getComments } = require("../controllers/commentController");

const router = express.Router();

router.post("/", upload, addComment);
router.get("/", getComments);

module.exports = router;
