const Message = require("../models/messageModel");
const Appointment = require("../models/appointmentModel");
const AppointmentInvite = require("../models/appointmentInvite.model");
const AppError = require("../utils/appError");
const {t} = require("../utils/i18n");

const createMessage = async ({ appointmentId, senderId, content }) => {
  const message = await Message.create({
    appointment: appointmentId,
    sender: senderId,
    content,
  });

  return message;
};

const checkAppointmentAccess = async (appointmentId, userId,lang="ar") => {
  const appointment = await Appointment.findById(appointmentId).select("userId");
  if (!appointment) {
    throw new AppError(t(lang, "APPOINTMENT_NOT_FOUND"), 404);
  }
  if (appointment.userId.toString() === userId.toString()) {
    return true;
  }
  const invite = await AppointmentInvite.findOne({
    appointmentId,
    receiverId: userId,
    status: "accepted",
  });

  if (!invite) {
    throw new AppError(t(lang, "CHAT_ACCESS_DENIED"), 403);
  }

  return true;
};

const getAppointmentMessages = async (appointmentId, userId, lang="ar") => {
  await checkAppointmentAccess(appointmentId, userId, lang);

  return Message.find({
    appointment: appointmentId,
  })
    .populate("sender", "name profileImage")
    .sort({
      createdAt: 1,
    });
};

module.exports = {
  createMessage,
  getAppointmentMessages,
  checkAppointmentAccess,
};
