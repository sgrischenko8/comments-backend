const sanitizeHtml = require("sanitize-html");
const htmlValidator = require("html-validator");

const validateAndSanitizeHtml = async (html) => {
  const allowedTags = ["a", "code", "i", "strong"];
  const allowedAttributes = {
    a: ["href", "title"],
  };

  const fullHtml = `<!DOCTYPE html><html><head><title>Validation Check</title></head><body>${html}</body></html>`;

  const sanitizedHtml = sanitizeHtml(html, {
    allowedTags: allowedTags,
    allowedAttributes: allowedAttributes,
    textFilter: function (text) {
      return text;
    },
  });

  try {
    const result = await htmlValidator({
      data: fullHtml,
      format: "html",
    });

    if (result.includes("Error")) {
      throw new Error("Invalid XHTML");
    }
  } catch (error) {
    throw new Error("Invalid XHTML");
  }

  return sanitizedHtml;
};

module.exports = validateAndSanitizeHtml;
