const Appointment = require("../models/appointmentModel");
const Calculation = require("../models/calculationModel");

const mapsService = require("./maps.service");
const mlService = require("./ml.service");
const weatherService = require("./weather.service");

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

  const totalTravelTime =
    routeData.durationMinutes + bufferMinutes;

  const departureTime = new Date(
    targetArrivalTime.getTime() -
      totalTravelTime * 60000,
  );

  const preparationNotificationTime = new Date(
    departureTime.getTime() -
      appointment.preparationTimeMinutes * 60000,
  );

  return {
    routeDuration: routeData.durationMinutes,
    bufferMinutes,
    departureTime,
    weatherCondition,
    weatherSeverity,
    preparationNotificationTime,
    isHoliday,
  };
};

const savePlanning = async (
  appointmentId,
  planningData,
) => {
  const calculation =
    await Calculation.findOneAndUpdate(
      {
        appointmentId,
      },
      {
        appointmentId,
        routeDuration:
          planningData.routeDuration,
        bufferMinutes:
          planningData.bufferMinutes,
        departureTime:
          planningData.departureTime,
        weatherCondition:
          planningData.weatherCondition,
        weatherSeverity:
          planningData.weatherSeverity,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

  await Appointment.findByIdAndUpdate(
    appointmentId,
    {
      estimatedTravelTime:
        planningData.routeDuration +
        planningData.bufferMinutes,

      actualDepartureTime:
        planningData.departureTime,
    },
    {
      new: true,
    },
  );

  return calculation;
};

module.exports = {
  calculatePlanning,
  savePlanning,
};