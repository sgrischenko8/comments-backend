const Queue = require("bull");
const redisConfig = { redis: process.env.REDISCLOUD_URL };

const commentQueue = new Queue("commentQueue", redisConfig);

const Comment = require("./models/Comment");

commentQueue.process(async (job) => {
  const { userName, email, text, image, file, parentId } = job.data;

  try {
    const newComment = await Comment.create({
      userName,
      email,
      text,
      image,
      file,
      parentId,
    });

    return newComment.dataValues;
  } catch (error) {
    console.error("Error saving comment:", error);
    throw new Error("Failed to save comment");
  }
});

module.exports = commentQueue;
