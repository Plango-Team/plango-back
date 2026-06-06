const Appointment = require("../models/appointmentModel");
const appointmentService = require("../services/appointment.service");
const AppError = require("../utils/appError");
const catchAsync = require("express-async-handler");
const { sendSuccess } = require("../utils/helpers");
const { Result } = require("express-validator");
const { t } = require('../utils/i18n');

exports.getAppointments = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { category, from, to } = req.query;
  
  const appointments = await appointmentService.getAppointments({ userId, category,from,to, lang: req.lang });
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
  const {id}  = req.params;
  const appointment = await appointmentService.getAppointment({ id, userId }, req.lang);
  sendSuccess(res, 200, t(req.lang, 'success'), { appointment });


});

  exports.createAppointment = catchAsync(async (req, res) => {
    const userId = req.user._id;  
    const data = req.body;

    const newAppointment = await appointmentService.createAppointment({ data, userId, lang: req.lang });
    sendSuccess(res, 201, t(req.lang, 'APPOINTMENT_CREATED'), { appointment: newAppointment });

}); 

exports.updateAppointment = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {id} = req.params;
  const data = req.body;
  const updatedAppointment = await appointmentService.updateAppointment({ id, userId, data }, req.lang);
  sendSuccess(res, 200, t(req.lang, 'APPOINTMENT_UPDATED'), { appointment: updatedAppointment });

  
});

exports.deleteAppointment = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {id} = req.params;
  await appointmentService.deleteAppointment({ id, userId }, req.lang);
  sendSuccess(res, 200, t(req.lang, 'APPOINTMENT_DELETED'), null);

});


