const catchAsync = require("express-async-handler");
const postService = require("../services/post.service");
const { sendSuccess } = require("../utils/helpers");
const { t } = require("../utils/i18n");

exports.createPost = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const lang = req.lang;

  const post = await postService.createPost({
    data: req.body,
    userId,
    lang,
  });

  sendSuccess(res, 201, t(lang, "POST_CREATED"), {
    post,
  });
});

exports.getPosts = catchAsync(async (req, res) => {
  const lang = req.lang;

  const result = await postService.getPosts({
    page: req.query.page,
    limit: req.query.limit,
  });

  sendSuccess(res, 200, t(lang, "POSTS_RETRIEVED"), result);
});

exports.toggleLike = catchAsync(async (req, res) => {
  const lang = req.lang;

  const result = await postService.toggleLike({
    postId: req.params.id,
    userId: req.user._id,
    lang,
  });

  sendSuccess(res, 200, t(lang, "POST_UPDATED"), {
    result,
  });
});

exports.deletePost = catchAsync(async (req, res) => {
  const lang = req.lang;

  await postService.deletePost({
    postId: req.params.id,
    userId: req.user._id,
    lang,
  });

  sendSuccess(res, 200, t(lang, "POST_DELETED"), null);
});