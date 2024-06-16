const sanitizeHtml = require("sanitize-html");
const htmlValidator = require("html-validator");

// Функция для очистки и проверки HTML-кода
const validateAndSanitizeHtml = async (html) => {
  // Разрешенные теги и атрибуты
  const allowedTags = ["a", "code", "i", "strong"];
  const allowedAttributes = {
    a: ["href", "title"],
  };

  // Оборачиваем фрагмент HTML в полный документ
  const fullHtml = `<!DOCTYPE html><html><head><title>Validation Check</title></head><body>${html}</body></html>`;

  // Очистка HTML-кода
  const sanitizedHtml = sanitizeHtml(html, {
    allowedTags: allowedTags,
    allowedAttributes: allowedAttributes,
    textFilter: function (text) {
      return text; // Возвращаем текст без экранирования HTML
    },
  });

  // Проверка валидности XHTML
  try {
    const result = await htmlValidator({
      data: fullHtml,
      format: "html",
    });

    // console.log("HTML Validator result:__________________", result);

    if (result.includes("Error")) {
      throw new Error("Invalid XHTML");
    }
  } catch (error) {
    throw new Error("Invalid XHTML");
  }

  return sanitizedHtml;
};

module.exports = validateAndSanitizeHtml;
