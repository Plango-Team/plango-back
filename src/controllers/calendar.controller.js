const { catchAsync } = require("../utils/helpers");
const calendarService = require("../services/calendar.service");
const { sendSuccess } = require("../utils/helpers");
const { t } = require("../utils/i18n");

exports.getCalendar = catchAsync(async (req, res) => {

  const schedule = await calendarService.getCalendar({
    userId: req.user._id,
    from: req.query.from,
    to: req.query.to,
  });

  sendSuccess(
    res,
    200,
    t(req.lang, "success"),
    {
      results: schedule.length,
      schedule,
    },
  );
});