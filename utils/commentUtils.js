// utils/commentUtils.js
const Comment = require("../models/Comment");

async function getCommentsWithChildren(sortBy, sortOrder, limit, offset) {
  // Запрос для получения родительских комментариев
  const topCommentsQuery = `
    SELECT * FROM Comments
    WHERE parentId IS NULL
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT :limit OFFSET :offset;
  `;
  const topComments = await Comment.sequelize.query(topCommentsQuery, {
    replacements: { limit, offset },
    model: Comment,
    mapToModel: true,
  });

  // Использование рекурсивного CTE для получения всех дочерних комментариев
  const allCommentsQuery = `
    WITH RECURSIVE CommentCTE AS (
      SELECT * FROM Comments WHERE parentId IS NULL
      UNION ALL
      SELECT c.* FROM Comments c
      INNER JOIN CommentCTE ON c.parentId = CommentCTE.id
    )
    SELECT * FROM CommentCTE;
  `;
  const allComments = await Comment.sequelize.query(allCommentsQuery, {
    model: Comment,
    mapToModel: true,
  });

  // Построение дерева комментариев
  const buildCommentTree = (comments, parentId = null) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => {
        const children = buildCommentTree(comments, comment.id);
        return { ...comment.toJSON(), children };
      });
  };

  const commentTree = topComments.map((comment) => {
    const children = buildCommentTree(allComments, comment.id);
    return { ...comment.toJSON(), children };
  });

  return commentTree;
}

module.exports = { getCommentsWithChildren };
