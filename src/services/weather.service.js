const axios = require("axios");
const { config } = require("../config");
const AppError = require("../utils/appError");

const getWeatherData = async (lat, lng) => {
  const { data } = await axios.get(
    "http://api.weatherapi.com/v1/current.json",
    {
      params: {
        key: config.weatherApiKey,
        q: `${lat},${lng}`,
      },
    },
  );

  if (!data?.current?.condition?.text) {
    throw new AppError("Invalid weather service response", 500);
  }

  const condition = data.current.condition.text.toLowerCase();

  let weatherSeverity = 0;

  if (
    condition.includes("storm") ||
    condition.includes("thunder")
  ) {
    weatherSeverity = 3;
  } else if (
    condition.includes("rain") ||
    condition.includes("drizzle") ||
    condition.includes("shower")
  ) {
    weatherSeverity = 2;
  } else if (
    condition.includes("cloud") ||
    condition.includes("overcast") ||
    condition.includes("mist") ||
    condition.includes("fog")
  ) {
    weatherSeverity = 1;
  }

  return {
    weatherCondition: condition,
    weatherSeverity,
  };
};

module.exports = {
  getWeatherData,
};