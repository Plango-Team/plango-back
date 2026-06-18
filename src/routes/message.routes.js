const router = require("express").Router();
const { getMessages } = require("../controllers/message.controller");
const { protect } = require('../middlewares');
const { getMessagesValidator } = require("../validators/message.validator");

router.get(
  "/:appointmentId",
  protect,
  getMessagesValidator,
  getMessages,
);

module.exports = router;
