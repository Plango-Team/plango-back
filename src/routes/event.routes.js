const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const { protect, restrictTo, } = require("../middlewares/authMiddleware");

router.get("/",eventController.getEvents);

router.get("/:id",eventController.getEvent);

router.get("/company/my-events",protect,restrictTo("org"),
eventController.getCompanyEvents
);

router.post("/",protect,restrictTo("org"),eventController.createEvent);

router.patch("/:id",protect,restrictTo("org"),eventController.updateEvent);

router.delete("/:id",protect,restrictTo("org"),eventController.deleteEvent);

router.patch("/:id/toggle-status",protect,restrictTo("org"),eventController.toggleEventStatus);


module.exports = router;
