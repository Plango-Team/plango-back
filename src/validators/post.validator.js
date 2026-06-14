const { body, param , query } = require("express-validator");
const { validate } = require("../middlewares");

exports.createPostValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("post content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("post content must be between 1 and 500 characters"),

  validate,
];

exports.postIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("invalid post id"),

  validate,
];

exports.getPostsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  validate,
];