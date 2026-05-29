const Event = require("../models/eventModel");
const Appointment = require("../models/appointmentModel");
const AppError = require("../utils/appError");

const getEvents = async ({
  category,
  from,
  to,
  isActive,
  priceType,
  lng,
  lat,
}) => {
  const pipeline = [];

  //   الـ GeoNear لحساب المسافة والترتيب التلقائي للأقرب جغرافياً
  if (lng && lat) {
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)], // إحداثيات اليوزر الحالية
        },
        distanceField: "distance", // يرجع المسافة بالمتر للفرونت إند
        spherical: true,
        query: { isActive: isActive },
      },
    });
  } else {
    // الفعاليات النشطة فقط
    pipeline.push({ $match: { isActive: isActive } });
  }

  // 2️⃣ بناء فلاتر البحث الأخرى (التصنيف، السعر، التاريخ)
  const matchFilters = {};

  if (category) matchFilters.category = category;

  // فلاتر السعر الذكية (مجاني أو مدفوع)
  if (priceType === "free") {
    matchFilters.$or = [
      { price: 0 },
      { price: { $exists: false } },
      { price: null },
    ];
  } else if (priceType === "paid") {
    matchFilters.price = { $gt: 0 };
  }

  // فلاتر النطاق الزمني لبداية الفعالية
  if (from || to) {
    matchFilters.startDate = {};
    if (from) matchFilters.startDate.$gte = new Date(from);
    if (to) matchFilters.startDate.$lte = new Date(to);
  }

  if (Object.keys(matchFilters).length > 0) {
    pipeline.push({ $match: matchFilters });
  }

  pipeline.push({
    $lookup: {
      from: "users",
      localField: "companyId",
      foreignField: "_id",
      as: "companyId",
    },
  });

  pipeline.push(
    { $unwind: "$companyId" },
    {
      $project: {
        "companyId.password": 0, // تأمين البيانات للشركة
        "companyId.role": 0,
        "companyId.createdAt": 0,
        "companyId.updatedAt": 0,
        "companyId.__v": 0,
      },
    },
  );

  pipeline.push({
    $addFields: {
      distance: { $ifNull: ["$distance", null] },

      status: {
        $cond: {
          if: { $eq: ["$isActive", false] },
          then: "inactive",
          else: {
            $cond: {
              if: { $lt: ["$endDate", new Date()] },
              then: "expired",
              else: {
                $cond: {
                  if: { $gt: ["$startDate", new Date()] },
                  then: "upcoming",
                  else: "ongoing",
                },
              },
            },
          },
        },
      },
    },
  });

  const sortStage = {};
  if (lng && lat) {
    sortStage.distance = 1;
  }
  sortStage.startDate = 1;

  pipeline.push({ $sort: sortStage });

  return await Event.aggregate(pipeline);
};

const getEvent = async ({ id }) => {
  const event = await Event.findOne({ _id: id, isActive: true }).populate(
    "companyId",
    "name email",
  );

  if (!event) {
    throw new AppError(
      "No active event found with that ID",
      404,
      "EVENT_NOT_FOUND",
    );
  }

  const eventObj = event.toObject();
  eventObj.distance = null;

  return eventObj;
};

const addEventToSchedule = async ({
  eventId,
  userId,
  startLocation,
  transportation,
}) => {
  const event = await Event.findOne({ _id: eventId, isActive: true });
  if (!event) {
    throw new AppError("Event not found or inactive", 404, "EVENT_NOT_FOUND");
  }

  if (!startLocation || !transportation) {
    throw new AppError(
      "Start location and transportation are required",
      400,
      "MISSING_FIELDS",
    );
  }

  const newAppointment = new Appointment({
    title: event.title,
    description: event.description,
    category: "other",
    transportation,
    arrivalTime: event.startDate, // ميعاد بداية الفعالية هو ميعاد وصول اليوزر المطلوب
    startLocation,
    destinationLocation: {
      addressName: event.location.addressName,
      fullAddress: event.location.fullAddress,
      type: "Point",
      coordinates: event.location.coordinates,
    },
    userId,
    eventId: event._id,
  });

  await newAppointment.calculateTravelTime();
  await newAppointment.save();

  return newAppointment;
};

const createEvent = async ({ data, companyId }) => {
  if (!data) {
    throw new AppError("Event data is required", 400, "MISSING_DATA");
  }
  return await Event.create({ ...data, companyId });
};

const getCompanyEvents = async ({ companyId }) => {
  return await Event.find({ companyId }).sort({ startDate: 1 });
};

const updateEvent = async ({ id, companyId, data }) => {
  const event = await Event.findOneAndUpdate({ _id: id, companyId }, data, {
    new: true,
    runValidators: true,
  });

  if (!event) {
    throw new AppError(
      "No event found with that ID or unauthorized",
      404,
      "EVENT_NOT_FOUND",
    );
  }
  return event;
};

const deleteEvent = async ({ id, companyId }) => {
  const event = await Event.findOneAndDelete({ _id: id, companyId });

  if (!event) {
    throw new AppError(
      "No event found with that ID or unauthorized",
      404,
      "EVENT_NOT_FOUND",
    );
  }
  return event;
};

const toggleEventStatus = async ({ id, companyId }) => {
  const event = await Event.findOne({ _id: id, companyId });

  if (!event) {
    throw new AppError(
      "No event found with that ID or unauthorized",
      404,
      "EVENT_NOT_FOUND",
    );
  }

  event.isActive = !event.isActive;
  await event.save();
  return event;
};

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  getCompanyEvents,
  updateEvent,
  deleteEvent,
  toggleEventStatus,
  addEventToSchedule,
};
