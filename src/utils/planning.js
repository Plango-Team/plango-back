const getRecalculationLeadTime = (totalTravelTime) => {
  if (totalTravelTime <= 30) {
    return 60;
  }

  if (totalTravelTime <= 60) {
    return 90;
  }

  if (totalTravelTime <= 180) {
    return 120;
  }

  if (totalTravelTime <= 360) {
    return 180;
  }

  if (totalTravelTime <= 720) {
    return 240;
  }

  return 360;
};

const shouldScheduleRecalculation = (appointmentTime, leadTimeMinutes) => {
  const remainingMinutes = Math.floor((appointmentTime - Date.now()) / 60000);

  return remainingMinutes > leadTimeMinutes;
};

const getRecalculationDelay = (appointmentTime, leadTimeMinutes) => {
  return appointmentTime.getTime() - leadTimeMinutes * 60000 - Date.now();
};

module.exports = {
  getRecalculationLeadTime,
  shouldScheduleRecalculation,
  getRecalculationDelay,
};
