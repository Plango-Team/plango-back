const Notification = require("../models/notificationModel");

const AppError = require("../utils/appError");

const notificationQueue = require("../jobs/queues/notification.queue");


const createNotification = async (payload) => {
  const notification = await Notification.create(payload);
  const delay = payload.scheduledFor?  new Date(payload.scheduledFor).getTime() - Date.now() : 0;

  const job = await notificationQueue.add("sendNotification", notification.toObject(), {
    delay: delay > 0 ? delay : 0,
  });
  notification.jobId = job.id;
  await notification.save();
  return notification;
};

const getUserNotifications = async ({
  userId,
  page = 1,
  limit = 10,
  unreadOnly = false,
}) => {
  const skip = (page - 1) * limit;

  const filter = {
    recipient: userId,
  };

  if (unreadOnly) {
    filter.isRead = false;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments(filter);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

const markAsRead = async ({ notificationId, userId }) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    {
      isRead: true,
    },
    {
      new: true,
    }
  );

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      isRead: true,
    }
  );
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};