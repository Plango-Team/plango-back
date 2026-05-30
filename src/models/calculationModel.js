const mongoose = require("mongoose");

const calculationSchema = new mongoose.Schema(
  {
    AppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: [true, "appointment id is required"],
      unique: true,
      index: true,
    },
    routeDuration: {
      type: Number,
      required: [true, "route duration is required"],
      min: [0, "route duration must be a positive number"],
    },
    bufferMinutes: {
      type: Number,
      required: [true, "buffer minutes is required"],
      min: [0, "buffer minutes must be a positive number"],
    },
    departureTime: {
      type: Date,
      required: [true, "departure time is required"],
    },
    weatherCondition: {
      type: String,
      required: [true, "weather conditions are required"],
      enum: ["Clear", "Cloudy", "Rain", "Storm"],
    },
    weatherseverity: {
      type: Number,
      required: [true, "weather severity is required"],
      enum: [0, 1, 2, 3],
    },
    modelVersion: {
      type: String,
      default: "V1",
    },
  },
  { timestamps: true }
);

calculationSchema.virtual("totalTravelTime").get(function () {
  return this.routeDuration + this.bufferMinutes;
});

const Calculation = mongoose.model("Calculation", calculationSchema);
module.exports = Calculation;
