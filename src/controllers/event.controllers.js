const catchAsync = require("express-async-handler");
const { sendSuccess } = require("../utils/helpers");
const eventService = require("../services/event.service");
const { t } = require("../utils/i18n");

exports.getEvents = catchAsync(async (req, res) => {
  console.log("Current user in getEvents:", req.user);
  //  كل الفلاتر بما فيها إحداثيات اليوزر الحالية ونوع السعر
  const { category, from, to, priceType, lng, lat } = req.query;
  const currentUserId = req.user ? req.user._id : null;

  const events = await eventService.getEvents({
    category,
    from,
    to,
    priceType,
    lng,
    lat,
    isActive: true,
    currentUserId,
  });

  sendSuccess(res, 200, t(req.lang, "success"), {
    results: events.length,
    events,
  });
});

exports.getEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await eventService.getEvent({ id });

  sendSuccess(res, 200, t(req.lang, "success"), { event });
});

exports.addEventToSchedule = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const eventId = req.params.id;
  const { startLocation, transportation } = req.body;

  const appointment = await eventService.addEventToSchedule({
    eventId,
    userId,
    startLocation,
    transportation,
    lang: req.lang,
  });

  sendSuccess(res, 201, t(req.lang, "APPOINTMENT_CREATED"), { appointment });
});

exports.getCompanyEvents = catchAsync(async (req, res) => {
  const companyId = req.user._id;
  const events = await eventService.getCompanyEvents({ companyId });

  sendSuccess(res, 200, t(req.lang, "success"), {
    results: events.length,
    events,
  });
});

exports.createEvent = catchAsync(async (req, res) => {
  const companyId = req.user._id;
  const data = req.body;

  const newEvent = await eventService.createEvent({ data, companyId });

  sendSuccess(res, 201, t(req.lang, "EVENT_CREATED"), { event: newEvent });
});

exports.updateEvent = catchAsync(async (req, res) => {
  const companyId = req.user._id;
  const { id } = req.params;
  const data = req.body;

  const updatedEvent = await eventService.updateEvent({ id, companyId, data, lang: req.lang });

  sendSuccess(res, 200, t(req.lang, "EVENT_UPDATED"), { event: updatedEvent });
});

exports.deleteEvent = catchAsync(async (req, res) => {
  const companyId = req.user._id;
  const { id } = req.params;

  await eventService.deleteEvent({ id, companyId });

  sendSuccess(res, 200, t(req.lang, "EVENT_DELETED"), null);
});

exports.toggleEventStatus = catchAsync(async (req, res) => {
  const companyId = req.user._id;
  const { id } = req.params;

  const event = await eventService.toggleEventStatus({ id, companyId });

  sendSuccess(res, 200, t(req.lang, "EVENT_STATUS_UPDATED"), { event });
});
