// utils/cacheUtils.js
const NodeCache = require("node-cache");
const { getCommentsWithChildren } = require("./commentUtils");

const cache = new NodeCache();

async function updateCacheWithNewComments(s) {
  try {
    const commentsWithChildren = await getCommentsWithChildren();
    cache.set("latestComments", commentsWithChildren);

    // console.log("Cache updated with latest comments:", commentsWithChildren);
  } catch (error) {
    console.error("Error updating cache with latest comments:", error);
  }
}

module.exports = { cache, updateCacheWithNewComments };
