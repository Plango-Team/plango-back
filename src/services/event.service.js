const Event = require("../models/eventModel");
const AppError = require("../utils/appError");


const createEvent = async ({ data, companyId }) => {

    if (!data) {
        throw new AppError("Event data is required",400,"MISSING_DATA");
    }

    const newEvent = await Event.create({...data, companyId,});

    if (!newEvent) {
        throw new AppError("Failed to create event",500,"EVENT_CREATION_FAILED");
    }
return newEvent;
};

const getCompanyEvents = async ({ companyId }) => {

    const events = await Event.find({ companyId });

    return events;
};

const updateEvent = async ({id,companyId,data,}) => {

    const event = await Event.findOneAndUpdate({_id: id,companyId,},data,{new: true,
            runValidators: true,});

    if (!event) {
        throw new AppError("No event found with that ID",404,"EVENT_NOT_FOUND");
    }
return event;
};

const deleteEvent = async ({id,companyId,}) => {

    const event = await Event.findOneAndDelete({_id: id, companyId,});

    if (!event) {
        throw new AppError("No event found with that ID",404,"EVENT_NOT_FOUND");
    }

    return event;
};

const toggleEventStatus = async ({id,companyId,}) => {

    const event = await Event.findOne({_id: id,companyId,});

    if (!event) {
        throw new AppError("No event found with that ID",404,"EVENT_NOT_FOUND");
    }

    event.isActive = !event.isActive;

    await event.save();

    return event;
};

const getEvents = async ({category,from,to,isActive,}) => {

    const filter = {};

    // category filter
    if (category) {
        filter.category = category;
    }
  // active filter
    if (isActive !== undefined) {
        filter.isActive = isActive;
    }
// date filter
    if (from || to) {

        filter.startDate = {};
        if (from) {
            filter.startDate.$gte = new Date(from);
        }

        if (to) {
            filter.startDate.$lte = new Date(to);
        }
    }
        const events = await Event.find(filter).populate("companyId", "name email");

    return events;
};

const getEvent = async ({ id }) => {

    const event = await Event.findById(id).populate("companyId", "name email");

    if (!event) {
        throw new AppError("No event found with that ID",404,"EVENT_NOT_FOUND");
    }

    return event;
};

module.exports = {createEvent,getEvents,getEvent,getCompanyEvents,updateEvent,deleteEvent,
toggleEventStatus,
};