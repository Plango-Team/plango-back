const notificationService = require("./notification.service");

const schedulePlanningNotifications = async ({
  appointment,
  departureTime,
  lang,
}) => {
  const result = {};
  const messages = {
  ar: {
    prepareTitle: "قوم البس",
    prepareMessage: `موعد "${appointment.title}" اقترب.`,
    leaveTitle: "انزل يلااا",
    leaveMessage: `حان وقت المغادرة إلى "${appointment.title}".`,
  },
  en: {
    prepareTitle: "Time to prepare",
    prepareMessage: `Your appointment "${appointment.title}" is coming up soon.`,
    leaveTitle: "Time to leave",
    leaveMessage: `It's time to leave for "${appointment.title}".`,
  },
};

const text = messages[lang] || messages.en;

  if (appointment.preparationTime > 0) {
    const preparationTime = new Date(
      departureTime.getTime() -
        appointment.preparationTime * 60000,
    );

    result.preparationNotification =
      await notificationService.createNotification({
        recipient: appointment.userId,

        title: text.prepareTitle,

        message: text.prepareMessage,

        type: "appointment_preparation",

        scheduledFor: preparationTime,
      });
  }

  result.departureNotification =
    await notificationService.createNotification({
      recipient: appointment.userId,

      title: text.leaveTitle,

      message: text.leaveMessage,

      type: "appointment_departure",

      scheduledFor: departureTime,
    });

  return result;
};

module.exports = {
  schedulePlanningNotifications,
};