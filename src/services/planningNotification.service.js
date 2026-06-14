const notificationService = require("./notification.service");

const schedulePlanningNotifications = async ({
  appointment,
  departureTime,
  lang,
}) => {
  const result = {};

  if (appointment.preparationTime > 0) {
    const preparationTime = new Date(
      departureTime.getTime() -
        appointment.preparationTime * 60000,
    );

    result.preparationNotification =
      await notificationService.createNotification({
        recipient: appointment.userId,

        title: "Time to prepare",

        message: `Your appointment "${appointment.title}" is coming up soon.`,

        type: "appointment_preparation",

        scheduledFor: preparationTime,
      });
  }

  result.departureNotification =
    await notificationService.createNotification({
      recipient: appointment.userId,

      title: "Time to leave",

      message: `It's time to leave for "${appointment.title}".`,

      type: "appointment_departure",

      scheduledFor: departureTime,
    });

  return result;
};

module.exports = {
  schedulePlanningNotifications,
};