const Appointment = require("../models/appointmentModel");
const User = require("../models/user.model");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

const generateRecurringAppointments = async (data) => {
  let current = new Date(data.arrivalTime);
  let end = new Date(data.repeatUntil);
  const appointments = [];
  const recurrenceId = data.isRecurring ? new mongoose.Types.ObjectId() : null;
  if (current > end) return [];

  const dummyAppt = new Appointment({ ...data });
  await dummyAppt.calculateTravelTime();

  while (current <= end) {
    appointments.push({
      ...data,
      recurrenceId,
      arrivalTime: new Date(current),
      estimatedTravelTime: dummyAppt.estimatedTravelTime,
      polyline: dummyAppt.polyline,
      stepsCount: dummyAppt.stepsCount,
      caloriesBurned: dummyAppt.caloriesBurned,
    });
    let nextDate = new Date(current);
    if (data.repeatType === "daily") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (data.repeatType === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (data.repeatType === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    current = nextDate;
  }
  return Appointment.insertMany(appointments);
};

const createAppointment = async ({ data, userId, lang }) => {
  if (!data) {
    throw new AppError("Appointment data is required", 400, "MISSING_DATA");
  }
  if (data.isRecurring) {
    return await generateRecurringAppointments({ ...data, userId });
  }
  const newAppointment = await Appointment.create({ ...data, userId });
  if (!newAppointment) {
    throw new AppError(
      "Failed to create appointment",
      500,
      "APPOINTMENT_CREATION_FAILED",
    );
  }
  return newAppointment;
};

const getAppointments = async ({ userId, category, from, to, lang }) => {
  if (!userId) {
    throw new AppError("unauthorized", 401, "UNAUTHORIZED");
  }
  const filter = { userId };

  // category filter
  if (category) {
    filter.category = category;
  }
  // date filter
  if (from || to) {
    filter.arrivalTime = {};

    if (from) {
      filter.arrivalTime.$gte = new Date(from);
    }

    if (to) {
      filter.arrivalTime.$lte = new Date(to);
    }
  }
  const appointments = await Appointment.find(filter);
  if (!appointments) {
    throw new AppError("failed to fetch appointments", 500, "FETCH-FAILED");
  }
  return appointments;
};
const getAppointment = async ({ id, userId }) => {
  const appointment = await Appointment.findOne({ _id: id, userId });
  if (!appointment) {
    throw new AppError(
      "No appointment found with that ID",
      404,
      "APPOINTMENT_NOT_FOUND",
    );
  }
  return appointment;
};
const getAppointmentSeries = async ({ appointmentId, userId }) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    userId,
  });

  if (!appointment) {
    throw new AppError("Not found", 404);
  }

  if (!appointment.recurrenceId) {
    return [appointment];
  }

  return await Appointment.find({
    recurrenceId: appointment.recurrenceId,
    userId,
  }).sort({ arrivalTime: 1 });
};
const updateAppointment = async ({ id, userId, data }) => {
  const appointment = await Appointment.findOneAndUpdate(
    { _id: id, userId },
    data,
    {
      new: true,
      runValidators: true,
    },
  );
  if (!appointment) {
    throw new AppError(
      "No appointment found with that ID",
      404,
      "APPOINTMENT_NOT_FOUND",
    );
  }
  return appointment;
};
const deleteAppointment = async ({ id, userId }) => {
  const appointment = await Appointment.findOneAndDelete({ _id: id, userId });
  if (!appointment) {
    throw new AppError(
      "No appointment found with that ID",
      404,
      "APPOINTMENT_NOT_FOUND",
    );
  }
  return appointment;
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  generateRecurringAppointments,
  getAppointmentSeries,
};
