const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controllers");
const { protect, restrictTo, validate } = require("../middlewares/index");
const v = require("../validators/event.validation");

router.get("/", v.getEventsValidator, validate, eventController.getEvents);
router.get("/company/my-events", protect, restrictTo("org"), eventController.getCompanyEvents);
router.get("/:id", v.eventIdValidator, validate, eventController.getEvent);

router.post(
  "/:id/add-to-schedule",
  protect,
  v.eventIdValidator,
  v.addEventToScheduleValidator,
  validate,
  eventController.addEventToSchedule,
);

router.post("/", protect, restrictTo("org"), v.createEventValidator, validate, eventController.createEvent);
router.patch("/:id", protect, restrictTo("org"), v.eventIdValidator, v.updateEventValidator, validate, eventController.updateEvent);
router.delete("/:id", protect, restrictTo("org"), v.eventIdValidator, validate, eventController.deleteEvent);
router.patch(
  "/:id/toggle-status",
  protect,
  restrictTo("org"),
  v.eventIdValidator,
  validate,
  eventController.toggleEventStatus,
);

module.exports = router;
