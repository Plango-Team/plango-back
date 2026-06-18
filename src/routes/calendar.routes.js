const express = require("express");

const router = express.Router();

const calendarController = require("../controllers/calendar.controller");
const calendarValidation = require("../validators/calendar.validation");

const { protect } = require("../middlewares");

router.use(protect);

router.get("/", calendarValidation.getCalendarValidator, calendarController.getCalendar);

module.exports = router;