const { body, query, param } = require("express-validator");

exports.getMyNotificationsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("unreadOnly")
    .optional()
    .isBoolean()
    .withMessage("Unread only must be boolean"),
];

exports.markNotificationAsReadValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid notification id"),
];

exports.SaveFcmTokenValidation = [
  body("fcmToken")
    .notEmpty()
    .withMessage("FCM token cannot be empty"),
];