const NodeCache = require("node-cache");
const cache = new NodeCache();
const Comment = require("../models/Comment");

async function updateCacheWithNewComments() {
  try {
    const { count, rows: topComments } = await Comment.findAndCountAll({
      where: { parentId: null },
      order: [["createdAt", "DESC"]],
      limit: 3,
    });

    const buildCommentTree = (comments, parentId = null) => {
      return comments
        .filter((comment) => comment.parentId === parentId)
        .map((comment) => {
          const children = buildCommentTree(comments, comment.id);
          return { ...comment.toJSON(), Children: children };
        });
    };

    const allComments = await Comment.findAll({
      order: [["createdAt", "DESC"]],
    });

    const commentsWithChildren = topComments.map((comment) => {
      const children = buildCommentTree(allComments, comment.id);
      return { ...comment.toJSON(), Children: children };
    });

    cache.set("latestComments", commentsWithChildren);

    console.log("Cache updated with latest comments:", commentsWithChildren);
  } catch (error) {
    console.error("Error updating cache with latest comments:", error);
  }
}

module.exports = { cache, updateCacheWithNewComments };
