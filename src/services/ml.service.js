const axios = require("axios");
const { config } = require('../config');
const AppError = require('../utils/appError');

exports.predictBufferMinutes = async(features) => {
const { data } = await axios.post(config.mlApiUrl, features);
if(data?.bufferMinutes === undefined || data?.bufferMinutes === null) {
    throw new AppError("Invalid Ml Service Response");
}
 
    return data.bufferMinutes;
};