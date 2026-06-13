const appointmentService = require("../services/appointment.service");
const AppError = require("../utils/appError");
const catchAsync = require("express-async-handler");
const { sendSuccess } = require("../utils/helpers");
const { t } = require('../utils/i18n');


exports.getAppointments = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { category, from, to } = req.query;
  
  const appointments = await appointmentService.getAppointments({ userId, category, from, to, lang: req.lang });
  
  sendSuccess(res, 200, t(req.lang, 'success'), { results: appointments.length, appointments });
});


exports.getAppointmentSeries = catchAsync(async (req, res) => {
  const { id } = req.params;

  const appointments = await appointmentService.getAppointmentSeries({
    appointmentId: id,
    userId: req.user._id,
  });

  sendSuccess(res, 200, "success", {
    results: appointments.length,
    appointments,
  });
});


exports.getAppointment = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  
  const appointment = await appointmentService.getSingleAppointment({ id, userId }, req.lang);
  
  sendSuccess(res, 200, t(req.lang, 'success'), { appointment });
});


exports.createAppointment = catchAsync(async (req, res) => {
  const userId = req.user._id;  
  const data = req.body;

  const newAppointment = await appointmentService.createAppointment({ data, userId, lang: req.lang });
  
  sendSuccess(res, 201, t(req.lang, 'APPOINTMENT_CREATED'), { appointment: newAppointment });
}); 


exports.updateSingleAppointment = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params;
  const data = req.body;

  if (data.arrivalTime && new Date(data.arrivalTime) < new Date()) {
    return next(new AppError(t(req.lang, 'Arrival time cannot be in the past'), 400));
  }
  
  const updatedAppointment = await appointmentService.updateSingleAppointment({ id, userId, data }, req.lang);
  
  sendSuccess(res, 200, t(req.lang, 'APPOINTMENT_UPDATED'), { appointment: updatedAppointment });
});


exports.updateAppointmentSeries = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params; 
  const data = req.body;

  const result = await appointmentService.updateAppointmentSeries({ id, userId, data });

  
  sendSuccess(res, 200, t(req.lang, 'success'), { result });
});


exports.deleteSingleAppointment = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  
  await appointmentService.deleteSingleAppointment({ id, userId }, req.lang);
  
  sendSuccess(res, 200, t(req.lang, 'APPOINTMENT_DELETED'), null);
});

exports.deleteAppointmentSeries = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params;

  const result = await appointmentService.deleteAppointmentSeries({ id, userId });

  sendSuccess(res, 200, 'Whole series deleted successfully', { result });
});

