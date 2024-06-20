const jwt = require("jsonwebtoken");

exports.signCaptcha = (captcha) =>
  jwt.sign({ captcha }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
exports.extractCaptcha = (token) => {
  try {
    const { captcha } = jwt.verify(token, process.env.JWT_SECRET);
    return captcha;
  } catch (error) {
    console.log(error.message);
  }
};
