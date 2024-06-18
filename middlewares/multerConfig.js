const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /\.(jpeg|jpg|png|gif|txt)$/i;
    const extname = filetypes.test(path.extname(file.originalname));

    console.log(`File: ${file.originalname}, Extname: ${extname}`);

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
