const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controllers");
const { protect, restrictTo } = require("../middlewares/index");

router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEvent);

router.post(
  "/:id/add-to-schedule",
  protect,
  eventController.addEventToSchedule,
);

router.get(
  "/company/my-events",
  protect,
  restrictTo("org"),
  eventController.getCompanyEvents,
);

router.post("/", protect, restrictTo("org"), eventController.createEvent);
router.patch("/:id", protect, restrictTo("org"), eventController.updateEvent);
router.delete("/:id", protect, restrictTo("org"), eventController.deleteEvent);
router.patch(
  "/:id/toggle-status",
  protect,
  restrictTo("org"),
  eventController.toggleEventStatus,
);

module.exports = router;
