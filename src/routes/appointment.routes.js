const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentControllers");
const { protect, restrictTo,validate,rateLimiters } = require("../middlewares");
const v = require("../validators/appointment.validators");
//const {general}=rateLimiters;


router.use(protect);
router.post("/", v.createAppointment, validate, appointmentController.createAppointment);
router.get("/", v.getAppointmentsValidator, validate, appointmentController.getAppointments);
router.get("/series/:id", v.getAppointmentSeriesValidator, validate, appointmentController.getAppointmentSeries);
router.get("/:id", v.getAppointment, validate, appointmentController.getAppointment);
router.put("/:id", [...v.getAppointment, ...v.updateSingleAppointment], validate, appointmentController.updateSingleAppointment);
router.delete("/:id", v.getAppointment, validate, appointmentController.deleteSingleAppointment);

router.put("/series/:id", [...v.getAppointmentSeriesValidator, ...v.updateAppointmentSeries], validate, appointmentController.updateAppointmentSeries);
router.delete("/series/:id", v.getAppointmentSeriesValidator, validate, appointmentController.deleteAppointmentSeries);
module.exports = router;