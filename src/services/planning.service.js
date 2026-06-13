const Appointment = require("../models/appointmentModel");
const Calculation = require("../models/calculationModel");

const mapsService = require("./maps.service");
const mlService = require("./ml.service");
const weatherService = require("./weather.service");

const {
  schedulePlanningNotifications,
} = require("./planningNotification.service");
const notiticationQueue = require("../jobs/queues/notification.queue");
const planningQueue = require("../jobs/queues/planing.queue");
const {
  getRecalculationLeadTime,
  shouldScheduleRecalculation,
  getRecalculationDelay,
} = require("../utils/planning");

const { getHolidayValue } = require("../utils/holiday");
const AppError = require("../utils/appError");

const calculatePlanning = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  const routeData = await mapsService.getDetailedRoute(
    appointment.startLocation.coordinates,
    appointment.destinationLocation.coordinates,
    appointment.transportation,
  );

  const { weatherCondition, weatherSeverity } =
    await weatherService.getWeatherData(
      appointment.destinationLocation.coordinates[1],
      appointment.destinationLocation.coordinates[0],
    );

  const targetArrivalTime = new Date(
    appointment.arrivalTime.getTime() -
      appointment.arrivalBufferMinutes * 60000,
  );

  const isHoliday = getHolidayValue(targetArrivalTime);

  const bufferMinutes = await mlService.predictBufferMinutes({
    currentDuration: routeData.durationMinutes,
    hour: targetArrivalTime.getHours(),
    dayOfWeek: targetArrivalTime.getDay(),
    weatherSeverity,
    isHoliday,
  });

  const totalTravelTime = routeData.durationMinutes + bufferMinutes;

  const departureTime = new Date(
    targetArrivalTime.getTime() - totalTravelTime * 60000,
  );

  const preparationNotificationTime = new Date(
    departureTime.getTime() - appointment.preparationTimeMinutes * 60000,
  );

  return {
    appointment,
    routeDuration: routeData.durationMinutes,
    bufferMinutes,
    totalTravelTime,
    departureTime,
    weatherCondition,
    weatherSeverity,
    preparationNotificationTime,
    isHoliday,
  };
};

const savePlanning = async (
  appointment,
  planningData,
  scheduleRecalculation = true,
) => {
  const existingCalculation = await Calculation.findOne({
    appointmentId: appointment._id,
  });

  if (scheduleRecalculation && existingCalculation?.recalculationJobId) {
    await planningQueue.removePlanningJob(
      existingCalculation.recalculationJobId,
    );
  }
  if (existingCalculation?.preparationNotificationJobId) {
    await notificationQueue.removeNotificationJob(
      existingCalculation.preparationNotificationJobId,
    );
  }

  if (existingCalculation?.departureNotificationJobId) {
    await notificationQueue.removeNotificationJob(
      existingCalculation.departureNotificationJobId,
    );
  }
  const calculation = await Calculation.findOneAndUpdate(
    {
      appointmentId: appointment._id,
    },
    {
      appointmentId: appointment._id,
      routeDuration: planningData.routeDuration,
      bufferMinutes: planningData.bufferMinutes,
      departureTime: planningData.departureTime,
      weatherCondition: planningData.weatherCondition,
      weatherSeverity: planningData.weatherSeverity,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  await Appointment.findByIdAndUpdate(appointment._id, {
    estimatedTravelTime: planningData.totalTravelTime,
    actualDepartureTime: planningData.departureTime,
  });

  let hasRecalculationJob = false;

  if (scheduleRecalculation) {
    const leadTimeMinutes = getRecalculationLeadTime(
      planningData.totalTravelTime,
    );

    if (shouldScheduleRecalculation(appointment.arrivalTime, leadTimeMinutes)) {
      const delay = getRecalculationDelay(
        appointment.arrivalTime,
        leadTimeMinutes,
      );

      const job = await planningQueue.addPlanningJob(appointment._id, delay);

      calculation.recalculationJobId = job.id;

      hasRecalculationJob = true;

      await calculation.save();
    }
  }

  if (!scheduleRecalculation || !hasRecalculationJob) {
    calculation.recalculationJobId = null;

    const notifications = await schedulePlanningNotifications({
      appointment,
      departureTime: planningData.departureTime,
    });

    calculation.preparationNotificationJobId =
      notifications.preparationNotification?.jobId || null;

    calculation.departureNotificationJobId =
      notifications.departureNotification?.jobId || null;

    await calculation.save();
  }

  return calculation;
};

const cancelPlanning = async (appointmentId) => {
  const calculation = await Calculation.findOne({
    appointmentId,
  });

  if (!calculation) {
    return;
  }

  if (calculation.recalculationJobId) {
    await planningQueue.removePlanningJob(calculation.recalculationJobId);
  }

  if (calculation.preparationNotificationJobId) {
    await notificationQueue.removeNotificationJob(
      calculation.preparationNotificationJobId,
    );
  }

  if (calculation.departureNotificationJobId) {
    await notificationQueue.removeNotificationJob(
      calculation.departureNotificationJobId,
    );
  }

  await Calculation.deleteOne({
    appointmentId,
  });
};

module.exports = {
  calculatePlanning,
  savePlanning,
  cancelPlanning,
};
