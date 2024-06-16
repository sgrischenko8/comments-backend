const Queue = require("bull");
const redisConfig = { redis: { port: 6380, host: "127.0.0.1" } };

// Создание очереди для комментариев
const commentQueue = new Queue("commentQueue", redisConfig);

// Импортирование моделей и других зависимостей
const Comment = require("./models/Comment"); // Пример использования модели Comment

// Обработка задания из очереди
commentQueue.process(async (job) => {
  const { userName, email, text, image, file, parentId } = job.data;

  console.log(`Processing comment: ${text}`);

  // Здесь можно добавить любую необходимую обработку комментария
  // Например, проверка на спам, фильтрация и сохранение в базу данных
  try {
    // Пример сохранения в базу данных
    const newComment = await Comment.create({
      userName,
      email,
      text,
      image,
      file,
      parentId,
    });
      console.log("Comment saved successfully");
       return newComment;
  } catch (error) {
    console.error("Error saving comment:", error);
    throw new Error("Failed to save comment");
  }
});

module.exports = commentQueue;