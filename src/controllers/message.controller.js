const asyncHandler = require("express-async-handler");

const { getAppointmentMessages } = require("../services/message.service");

const getMessages = asyncHandler(async (req, res) => {
  const messages = await getAppointmentMessages(req.params.appointmentId, req.user._id, req.lang);

  res.status(200).json({
    success: true,
    data: messages,
  });
});

module.exports = {
  getMessages,
};
