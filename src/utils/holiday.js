const Holidays = require('date-holidays');

const hd = new Holidays('EG');

const isHoliday = (date) => {
  return hd.isHoliday(date) ? 1 : 0;
}

module.exports = {
  isHoliday
};