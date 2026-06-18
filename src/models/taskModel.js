const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    require: [true, "task should have title"],
    trim: true,
    minlength: [3, "task title should be at least 3 characters"],
    maxlength: [120, "task title should be at most 120 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, "task description should be at most 200 characters"],
  },
  deadline: {
    type: Date,
    require: [true, "task should have Deadline date"],
  },
  status: {
    type: String,
    require: [true, "task should have status"],
    enum: ["pending", "completed" , "lated"],
    default: "pending",
  },
  reminderTime: {
    type: Date,
  },
  priority: {
    type: String,
    require: [true, "task should have priority"],
    enum: ["low", "medium", "high"],
  },
  linkedAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
  },
  userId : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "task should have an owner"],
  },
});

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;
