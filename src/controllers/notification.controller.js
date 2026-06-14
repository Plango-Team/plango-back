const notificationService = require("../services/notification.service");
const User = require("../models/user.model");

const { catchAsync, sendSuccess } = require("../utils/helpers");
const AppError = require("../utils/appError");
const { t } = require("../utils/i18n");

exports.getMyNotifications = catchAsync(async (req, res) => {
  const data = await notificationService.getUserNotifications({
    userId: req.user._id,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    unreadOnly: req.query.unreadOnly === "true",
  });

  sendSuccess(res, 200, "Notifications fetched successfully", data);
});

exports.markNotificationAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead({
    notificationId: req.params.id,
    userId: req.user._id,
  });

  sendSuccess(res, 200, "Notification marked as read", notification);
});

exports.markAllNotificationsAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);

  sendSuccess(res, 200, "All notifications marked as read");
});

exports.testNotification = catchAsync(async (req, res) => {
  await notificationService.createNotification({
    recipient: req.user._id,

    type: "DELAY_NOTIFICATION",

    title: "Test Notification",

    message: "Realtime notification works successfully",

    channels: ["IN_APP"],

    data: {
      test: true,
    },
    scheduledFor: new Date(Date.now() + 10000), // Schedule for 10 seconds later
  });

  sendSuccess(res, 200, "Test notification sent successfully");
});

exports.saveFcmToken = catchAsync(async (req, res) => {
  const { fcmToken } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { fcmTokens: fcmToken },
  });

  if (!user) {
    throw new AppError(t(req.lang, "NOT_FOUND"), 404);
  }
  sendSuccess(res, 200, "FCM token saved successfully", user);
});
