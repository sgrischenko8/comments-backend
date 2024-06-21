const Comment = require("../models/Comment");

async function getCommentsWithChildren(
  sortBy = "createdAt",
  sortOrder = "DESC",
  limit = 25,
  offset = 0
) {
  let date = Date.now();

  // query by sql
  // const topCommentsQuery = `
  //   SELECT * FROM Comments
  //   WHERE parentId IS NULL
  //   ORDER BY ${sortBy} ${sortOrder}
  //   LIMIT :limit OFFSET :offset;
  // `;
  try {
    // const topComments = await Comment.sequelize.query(topCommentsQuery, {
    //   replacements: { limit, offset },
    //   model: Comment,
    //   mapToModel: true,
    // });
    const topComments = await Comment.findAll({
      where: { parentId: null },
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      include: [
        {
          model: Comment,
          as: "children",
        },
      ],
    });

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
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error fetching data from Database" });
  }
}

module.exports = { getCommentsWithChildren };
