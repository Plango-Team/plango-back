const { query } = require("express-validator");
const {validate} = require("../middlewares");

exports.getCalendarValidator = [
  query("from")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("invalid startDate"),

  query("to")
    .notEmpty()
    .withMessage("endDate is required")
    .isISO8601()
    .withMessage("invalid endDate")
    .custom((value, { req }) => {
      const startDate = new Date(req.query.from);
      const endDate = new Date(value);

      if (startDate > endDate) {
        throw new Error("'to' must be greater than or equal to 'from'");
      }

      return true;
    }),

  validate,
];