const { catchAsync, sendSuccess } = require("../utils/helpers");
const eventService = require("../services/event.service");
const Event = require("../models/eventModel"); 
const { t } = require("../utils/i18n");

exports.getEvents = catchAsync(async (req, res) => {

    const {category,from,to,isActive,} = req.query;

    const events = await eventService.getEvents({category,from,to,isActive,lang: req.lang,});

    sendSuccess( res,200,t(req.lang, "success"),
        {results: events.length,events,});
});

exports.getEvent = catchAsync(async (req, res) => {

    const { id } = req.params;
    const event = await eventService.getEvent({id,lang: req.lang,});

    sendSuccess(res, 200,t(req.lang, "success"),{event,});
});

exports.getCompanyEvents = catchAsync(async (req, res) => {

    const companyId = req.user._id;
    const events = await eventService.getCompanyEvents({companyId,lang: req.lang,});

    sendSuccess(res,200,t(req.lang, "success"),{
            results: events.length,
            events,
        });
});

exports.createEvent = catchAsync(async (req, res) => {

    const companyId = req.user._id;
    const data = req.body;

    const newEvent =await eventService.createEvent({data,companyId,lang: req.lang,});

    sendSuccess(res,201,t(req.lang, "EVENT_CREATED"),
        {
            event: newEvent,
        });
});

exports.updateEvent = catchAsync(async (req, res) => {

    const companyId = req.user._id;
    const { id } = req.params;
    const data = req.body;

    const updatedEvent =await eventService.updateEvent({id,companyId,data,lang: req.lang,});

    sendSuccess(res,200,t(req.lang, "EVENT_UPDATED"),
        {
            event: updatedEvent,
        });
});

exports.deleteEvent = catchAsync(async (req, res) => {

    const companyId = req.user._id;
    const { id } = req.params;

    await eventService.deleteEvent({id,companyId,lang: req.lang,});

    sendSuccess(res,200,t(req.lang, "EVENT_DELETED"),null);
});

exports.toggleEventStatus = catchAsync(async (req, res) => {

    const companyId = req.user._id;
    const { id } = req.params;

    const event =await eventService.toggleEventStatus({id,companyId,lang: req.lang,});

    sendSuccess(res,200,t(req.lang, "EVENT_STATUS_UPDATED"),
        {
            event,
        });
});