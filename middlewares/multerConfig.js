const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(".", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + file.originalname;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /\.(jpeg|jpg|png|gif|txt)$/i;
    const extname = filetypes.test(path.extname(file.originalname));

    // console.log(`File: ${file.originalname}, Extname: ${extname}`);

    if (extname) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Allowed file types are jpeg, jpg, png, gif for images and txt for text files."
        )
      );
    }
  },
}).fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

module.exports = upload;
