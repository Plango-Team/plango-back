// require("dotenv").config();

// const weatherService = require("./src/services/weather.service");

// (async () => {
//   const result = await weatherService.getWeatherData(
//     28.1099,
//     30.7503,
//   );

//   console.log(result);
// })();

require("dotenv").config();

const mongoose = require("mongoose");
const { config } = require("./src/config");

const planningService = require("./src/services/planning.service");

(async () => {
  try {
    await mongoose.connect(config.mongoUri);

    const result = await planningService.calculatePlanning(
      "6a1a58d6936d8a2726da4da7"
    );

    console.log(result);

    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
  }

  process.exit();
})();