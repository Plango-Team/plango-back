const Appointment = require("../models/appointmentModel");
const Task = require("../models/taskModel");

const getCalendar = async ({ userId, from, to }) => {
  const startDate = new Date(from);
  const endDate = new Date(to).setHours(23, 59, 59, 999);
  const [appointments, tasks] = await Promise.all([
    Appointment.find({
      userId,
      arrivalTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .select("title arrivalTime eventId")
      .lean(),

    Task.find({
      userId,
      deadline: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .select("title deadline linkedAppointment")
      .lean(),
  ]);

  const schedule = [
    ...appointments.map((appointment) => ({
      id: appointment._id,
      type: "appointment",
      title: appointment.title,
      date: appointment.arrivalTime,
      isEvent: !!appointment.eventId,
    })),

    ...tasks.map((task) => ({
      id: task._id,
      type: "task",
      title: task.title,
      date: task.deadline,
      linkedAppointment: task.linkedAppointment,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return schedule;
};

module.exports = {
  getCalendar,
};