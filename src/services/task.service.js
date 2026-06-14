const Task = require("../models/taskModel");
const Appointment = require("../models/appointmentModel");
const AppError = require("../utils/appError");
const createNotification = require("./notification.service").createNotification;
const Notification = require("../models/notificationModel");
const notificationQueue = require("../jobs/queues/notification.queue");
const { t } = require("../utils/i18n");

const createTask = async ({ data, userId, lang }) => {
  if (!data) {
    throw new AppError(t(lang, "MISSING_DATA"), 400, "MISSING_DATA");
  }

  let finalDeadline = data.deadline;

  if (data.linkedAppointment) {
    const appointment = await Appointment.findOne({
      _id: data.linkedAppointment,
      userId,
      // arrivalTime: {
      //   $gt: new Date(),
      // },
    });

    if (!appointment) {
      throw new AppError(
        t(lang, "APPOINTMENT_NOT_FOUND"),
        404,
        "APPOINTMENT_NOT_FOUND",
      );
    }

    if (new Date(appointment.arrivalTime) < new Date()) {
      throw new AppError(
        t(lang, "EXPIRED_APPOINTMENT"),
        400,
        "EXPIRED_APPOINTMENT",
      );
    }

    finalDeadline = appointment.arrivalTime;
  }

  if (!finalDeadline) {
    throw new AppError(t(lang, "MISSING_DEADLINE"), 400, "MISSING_DEADLINE");
  }

  const task = await Task.create({
    ...data,
    deadline: finalDeadline,
    userId,
  });

  if (!task) {
    throw new AppError(
      t(lang, "TASK_CREATION_FAILED"),
      500,
      "TASK_CREATION_FAILED",
    );
  }

  if (task.deadline) {
    await createNotification({
      recipient: userId,
      type: "task_deadline",
      title: t(lang, "TASK_REMINDER"),
      message: t(lang, "TASK_DEADLINE_REMINDER_MESSAGE", { title: task.title }),
      scheduledFor: task.deadline,
      data: {
        taskId: task._id,
      },
    });
  }

  return task;
};

const getTasks = async ({ userId }) => {
  const tasks = await Task.find({
    userId,
  })
    .populate("linkedAppointment", "title arrivalTime")
    .sort({
      deadline: 1,
    });

  return tasks;
};

const getTask = async ({ id, userId, lang }) => {
  const task = await Task.findOne({
    _id: id,
    userId,
  }).populate("linkedAppointment", "title arrivalTime");

  if (!task) {
    throw new AppError(t(lang, "TASK_NOT_FOUND"), 404, "TASK_NOT_FOUND");
  }

  return task;
};

const updateTask = async ({ id, userId, data, lang }) => {
  if (data.linkedAppointment) {
    const appointment = await Appointment.findOne({
      _id: data.linkedAppointment,
      userId,
    });

    if (!appointment) {
      throw new AppError(
        t(lang, "APPOINTMENT_NOT_FOUND"),
        404,
        "APPOINTMENT_NOT_FOUND",
      );
    }

    data.deadline = appointment.arrivalTime;
  }
  const oldTask = await Task.findOne({
    _id: id,
    userId,
  });
  if (!oldTask) {
    throw new AppError(t(lang, "TASK_NOT_FOUND"), 404, "TASK_NOT_FOUND");
  }
  const oldDeadline = oldTask.deadline?.toISOString();

  const task = await Task.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    data,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!task) {
    throw new AppError(t(lang, "TASK_NOT_FOUND"), 404, "TASK_NOT_FOUND");
  }
  const newDeadline = task.deadline.toISOString();

  if (oldDeadline && newDeadline && oldDeadline !== newDeadline) {
    const oldNotification = await Notification.findOne({
      "data.taskId": id,
      type: "task_deadline",
      recipient: userId,
    });
    if (oldNotification?.jobId) {
      await notificationQueue.removeNotificationJob(oldNotification.jobId);
      await oldNotification.deleteOne();
    }
    await createNotification({
      recipient: userId,
      type: "task_deadline",
      title: t(lang, "TASK_REMINDER"),
      message: t(lang, "TASK_DEADLINE_REMINDER_MESSAGE", { title: task.title }),
      scheduledFor: task.deadline,
      data: {
        taskId: task._id,
      },
    });
  }

  return task;
};

const deleteTask = async ({ id, userId, lang }) => {
  const task = await Task.findOneAndDelete({
    _id: id,
    userId,
  });

  if (!task) {
    throw new AppError(t(lang, "TASK_NOT_FOUND"), 404, "TASK_NOT_FOUND");
  }

  const notification = await Notification.findOne({
    "data.taskId": id,
    type: "task_deadline",
    recipient: userId,
  });
  if (notification?.jobId) {
    await notificationQueue.removeNotificationJob(notification.jobId);
    await notification.deleteOne();
  }

  return task;
};

const getLinkableAppointments = async ({ userId }) => {
  const appointments = await Appointment.find({
    userId,
    arrivalTime: {
      $gt: new Date(),
    },
  })
    .select("title arrivalTime")
    .sort({
      arrivalTime: 1,
    });

  return appointments;
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getLinkableAppointments,
};
