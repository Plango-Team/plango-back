const Post = require("../models/postModel");
const AppError = require("../utils/appError");
const { t } = require("../utils/i18n");
const { getIO } = require("../socket");

const createPost = async ({ data, userId, lang }) => {
  const post = await Post.create({
    content: data.content,
    userId,
  });

  if (!post) {
    throw new AppError(
      t(lang, "POST_CREATION_FAILED"),
      500,
      "POST_CREATION_FAILED",
    );
  }

  const io = getIO();
  io.emit("postCreated", post);

  return post;
};

const getPosts = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.find()
      .populate("userId", "name username role")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Post.countDocuments(),
  ]);

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / limit),
    posts,
  };
};

const toggleLike = async ({ postId, userId, lang }) => {
  const post = await Post.findOne({
    _id: postId,
  });

  if (!post) {
    throw new AppError(
      t(lang, "POST_NOT_FOUND"),
      404,
      "POST_NOT_FOUND",
    );
  }

  const alreadyLiked = post.likes.some(
    (id) => id.toString() === userId.toString(),
  );

  if (alreadyLiked) {
    post.likes.pull(userId);
  } else {
    post.likes.addToSet(userId);
  }

  await post.save();
  const io = getIO();
  io.emit("postLiked", {
    postId,
    userId,
    liked: !alreadyLiked,
  });

  return {
    liked: !alreadyLiked,
    totalLikes: post.likes.length,
  };
};

const deletePost = async ({ postId, userId, lang }) => {
  const post = await Post.findOneAndDelete({
    _id: postId,
    userId,
  });

  if (!post) {
    throw new AppError(
      t(lang, "POST_NOT_FOUND"),
      404,
      "POST_NOT_FOUND",
    );
  }

  const io = getIO();
  io.emit("postDeleted", { postId, userId });

  return post;
};

module.exports = {
  createPost,
  getPosts,
  toggleLike,
  deletePost,
};