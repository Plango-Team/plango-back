const { param } = require("express-validator");

const {validate} = require("../middlewares");

const getMessagesValidator = [
  param("appointmentId")
    .isMongoId()

    .withMessage("Invalid appointment id"),

  validate,
];

module.exports = {
  getMessagesValidator,
};
