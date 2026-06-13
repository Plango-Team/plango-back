const Appointment = require("../models/appointmentModel");
const AppointmentInvite = require("../models/appointmentInvite.model");
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
      distanceInMeters: dummyAppt.distanceInMeters, // ✨ متناسق مع تعديل الموديل
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
const savedAppointments = await Appointment.insertMany(appointments);
  
  const response = {
    ...savedAppointments[0].toObject(),
    totalCount: savedAppointments.length 
  };

  return response;
};

const createAppointment = async ({ data, userId }) => {
  if (!data) {
    throw new AppError("Appointment data is required", 400, "MISSING_DATA");
  }
  if (data.isRecurring) {
    return await generateRecurringAppointments({ ...data, userId });
  }
  const newAppointment = await Appointment.create({ ...data, userId });
  if (!newAppointment) {
    throw new AppError("Failed to create appointment", 500, "APPOINTMENT_CREATION_FAILED");
  }
  return newAppointment;
};

const getAppointments = async ({ userId, from, to }) => {
  if (!userId) {
    throw new AppError("unauthorized", 401, "UNAUTHORIZED");
  }

  
  const acceptedInvites = await AppointmentInvite.find({
    receiverId: userId,
    status: "accepted",
  });

  const acceptedAppointmentIds = acceptedInvites.map((invite) => invite.appointmentId);

  const filter = {
    $or: [
      { userId: userId },
      { _id: { $in: acceptedAppointmentIds } },
    ],
  };

  
  if (from || to) {
    filter.arrivalTime = {};
    if (from) filter.arrivalTime.$gte = new Date(from);
    if (to) filter.arrivalTime.$lte = new Date(to);
  }

  const appointments = await Appointment.find(filter);
  if (!appointments) {
    throw new AppError("failed to fetch appointments", 500, "FETCH_FAILED");
  }

  const result = appointments.map((appointment) => {
    const invite = acceptedInvites.find((inv) => inv.appointmentId.equals(appointment._id));

    
    if (!invite) {
      return appointment;
    }

    
    const appointmentObj = appointment.toObject({ virtuals: true });

  
    appointmentObj.startLocation = invite.startLocation || appointmentObj.startLocation;
    appointmentObj.transportation = invite.transportation || appointmentObj.transportation;
    appointmentObj.estimatedTravelTime = invite.estimatedTravelTime !== undefined ? invite.estimatedTravelTime : appointmentObj.estimatedTravelTime;
    appointmentObj.polyline = invite.polyline || appointmentObj.polyline;
    appointmentObj.stepsCount = invite.stepsCount !== undefined ? invite.stepsCount : appointmentObj.stepsCount;
    appointmentObj.caloriesBurned = invite.caloriesBurned !== undefined ? invite.caloriesBurned : appointmentObj.caloriesBurned;


    appointmentObj.travelHours = +((appointmentObj.estimatedTravelTime || 0) / 60).toFixed(1);

    return appointmentObj;
  });

  return result;
};

const getSingleAppointment = async ({ id, userId }) => {
  if (!userId) {
    throw new AppError("unauthorized", 401, "UNAUTHORIZED");
  }
  
  const appointment = await Appointment.findById(id).populate({
    path: 'participants',
    match: { status: 'accepted' },
    select: 'receiverId -_id', 
    populate: { 
      path: 'receiverId', 
      select: 'name username' 
    }
  });

  if (!appointment) {
    throw new AppError("No appointment found with that ID", 404, "APPOINTMENT_NOT_FOUND");
  }

  const invite = await AppointmentInvite.findOne({
    appointmentId: id,
    receiverId: userId,
    status: "accepted",
  });

  if (appointment.userId.toString() !== userId.toString() && !invite) {
    throw new AppError("You do not have permission to view this appointment", 403, "FORBIDDEN");
  }

  if (!invite) {
    return appointment;
  }

  const appointmentObj = appointment.toObject({ virtuals: true });

  appointmentObj.startLocation = invite.startLocation || appointmentObj.startLocation;
  appointmentObj.transportation = invite.transportation || appointmentObj.transportation;
  appointmentObj.estimatedTravelTime = invite.estimatedTravelTime !== undefined ? invite.estimatedTravelTime : appointmentObj.estimatedTravelTime;
  appointmentObj.polyline = invite.polyline || appointmentObj.polyline;
  appointmentObj.stepsCount = invite.stepsCount !== undefined ? invite.stepsCount : appointmentObj.stepsCount;
  appointmentObj.caloriesBurned = invite.caloriesBurned !== undefined ? invite.caloriesBurned : appointmentObj.caloriesBurned;

  appointmentObj.travelHours = +((invite.estimatedTravelTime || 0) / 60).toFixed(1);

  if (appointmentObj.participants && Array.isArray(appointmentObj.participants)) {
    appointmentObj.participants.forEach(p => {
      if (p.receiverId) {
        delete p.receiverId.passwordChangeCooldownHours;
        delete p.receiverId.emailChangeCooldownHours;
        delete p.receiverId.phoneChangeCooldownHours;
        delete p.receiverId.id; 
      }
      delete p.id; 
      delete p.travelHours;
    });
  }
  
  return appointmentObj;
};

const getAppointmentSeries = async ({ appointmentId, userId }) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, userId });
  if (!appointment) {
    throw new AppError("Not found", 404);
  }
  if (!appointment.recurrenceId) {
    return [appointment];
  }
  return await Appointment.find({ recurrenceId: appointment.recurrenceId, userId }).sort({ arrivalTime: 1 });
};

const updateSingleAppointment = async ({ id, userId, data }) => {
  const appointment = await Appointment.findOne({ _id: id, userId });
  if (!appointment) {
    throw new AppError("No appointment found", 404, "APPOINTMENT_NOT_FOUND");
  }

  const locationOrTransportChanged = data.startLocation || data.destinationLocation || data.transportation;

  Object.assign(appointment, data);

  if (locationOrTransportChanged) {
    await appointment.calculateTravelTime();
  }

  await appointment.save();
  return appointment;
};

const updateAppointmentSeries = async ({ id, userId, data }) => {
  if (data.arrivalTime) {
    throw new AppError(
      "You cannot update the arrival time of a whole series! Update single appointments instead.", 
      400, 
      "INVALID_SERIES_UPDATE"
    );
  }

  const appointment = await Appointment.findOne({ _id: id, userId });
  if (!appointment) {
    throw new AppError("No appointment found with that ID", 404, "APPOINTMENT_NOT_FOUND");
  }

  if (!appointment.recurrenceId) {
    return await updateSingleAppointment({ id, userId, data });
  }

  if (data.repeatUntil) {
    const newUntil = new Date(data.repeatUntil);
    await Appointment.deleteMany({
      recurrenceId: appointment.recurrenceId,
      userId,
      arrivalTime: { $gt: newUntil } 
    });
  }

  const locationOrTransportChanged = data.startLocation || data.destinationLocation || data.transportation;
  
  
  if (locationOrTransportChanged) {
    Object.assign(appointment, data);
    await appointment.calculateTravelTime();
    
    data.estimatedTravelTime = appointment.estimatedTravelTime;
    data.polyline = appointment.polyline;
    data.stepsCount = appointment.stepsCount;
    data.caloriesBurned = appointment.caloriesBurned;
    data.distanceInMeters = appointment.distanceInMeters;
  }

  await Appointment.updateMany(
    { recurrenceId: appointment.recurrenceId, userId },
    { $set: data },
    { runValidators: true }
  );

  return { message: "Series updated successfully" };
};

const deleteSingleAppointment = async ({ id, userId }) => {
  const appointment = await Appointment.findOneAndDelete({ _id: id, userId });
  if (!appointment) {
    throw new AppError("No appointment found with that ID", 404, "APPOINTMENT_NOT_FOUND");
  }
  return appointment;
};

const deleteAppointmentSeries = async ({ id, userId }) => {
  const appointment = await Appointment.findOne({ _id: id, userId });
  if (!appointment) {
    throw new AppError("No appointment found with that ID", 404, "APPOINTMENT_NOT_FOUND");
  }

  if (!appointment.recurrenceId) {
    await appointment.deleteOne();
    return { deletedCount: 1 };
  }
  return await Appointment.deleteMany({ recurrenceId: appointment.recurrenceId, userId });
};

module.exports = {
  createAppointment,
  getAppointments,
  getSingleAppointment,
  updateSingleAppointment,
  updateAppointmentSeries,
  deleteSingleAppointment,
  deleteAppointmentSeries,
  generateRecurringAppointments,
  getAppointmentSeries,
};