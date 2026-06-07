const express = require("express");

const postController = require("../controllers/post.controller");
const { createPostValidator , getPostsValidator , postIdValidator } = require("../validators/post.validator");

const { protect } = require("../middlewares");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(
    createPostValidator,
    postController.createPost,
  )
  .get(
    getPostsValidator,
    postController.getPosts,
  );

router.patch(
  "/:id/like",
  postIdValidator,
  postController.toggleLike,
);

router.delete(
  "/:id",
  postIdValidator,
  postController.deletePost,
);

module.exports = router;