const Jimp = require("jimp");
const path = require("path");
const { extractCaptcha } = require("../utils/jwtService");

const checkBody = async (req, res, next) => {
  const { captcha: cryptedCaptcha } = req.cookies;
  const { userName, email, text, captcha } = req.body;
  try {
    if (!userName || !email || !text || !cryptedCaptcha) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (extractCaptcha(cryptedCaptcha) !== captcha) {
      return res.status(400).json({ error: "Invalid CAPTCHA" });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email should be valid" });
    }
    if (req.files && req.files.image) {
      if (req.files.image[0]) {
        image = req.files.image[0];

        // check image size and resize
        const imagePath = path.resolve(__dirname, "..", image.path);
        const loadedImage = await Jimp.read(imagePath);
        loadedImage.contain(
          320,
          240,
          Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE,
          (err, image) => {
            if (err) {
              console.error("Error processing image:", err);
              return res.status(500).json({
                message: "Error processing image",
              });
            }

            image.write(imagePath, (err) => {
              if (err) {
                console.error("Error saving image:", err);
                return res.status(500).json({
                  message: "Error saving image",
                });
              }
            });
          }
        );
      } else {
        return res.status(400).json({
          message: "No image file uploaded",
        });
      }
    }

    if (req.files && req.files.file) {
      if (req.files.file[0]) {
        file = req.files.file[0];
        if (
          file.mimetype === "text/plain" &&
          file.originalname.slice(-4).toUpperCase() === ".TXT"
        ) {
          if (file.size > 100 * 1024) {
            return res.status(400).json({
              message: "Text file not allowed to be bigger than 100kb.",
            });
          }
        } else {
          return res
            .status(400)
            .json({ message: "You are allowed to upload only .txt files." });
        }
      } else {
        return res.status(400).json({
          message: "No text file uploaded",
        });
      }
    }
    next();
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
};
module.exports = checkBody;
