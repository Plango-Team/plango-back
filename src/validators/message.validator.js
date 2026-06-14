const { param } = require("express-validator");

const validate = require("../middlewares/validate.middleware");

const getMessagesValidator = [
  param("appointmentId")
    .isMongoId()

    .withMessage("Invalid appointment id"),

  validate,
];

module.exports = {
  getMessagesValidator,
};
