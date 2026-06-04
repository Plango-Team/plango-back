const mongoose = require("mongoose");
const locationSchema = require("./locationSchema");
const { isAxiosError } = require("axios");

const appointmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [32, "Title cannot exceed 32 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user id is required"],
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    transportation: {
      type: String,
      enum: ["driving", "walking", "other"],
      required: [true, "transportation method is required"],
    },
    estimatedTravelTime: {
      type: Number,
    },
    arrivalTime: {
      type: Date,
      required: [true, "arrival time is required"],
    },
    actualDepartureTime: { type: Date },
    startLocation: {
      type: locationSchema,
      required: [true, "start location is required"],
    },
    destinationLocation: {
      type: locationSchema,
      required: [true, "destination location is required"],
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    repeatType: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
    },
    repeatUntil: {
      type: Date,
    },
    recurrenceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    startedTrip: {
      type: Boolean,
      default: false,
    },
    polyline: { type: String },
    stepsCount: { type: Number, default: null },
    caloriesBurned: { type: Number, default: null },
    DistanceInMeters: { type: Number, default: null },
  },
  { timestamps: true },
);

appointmentSchema.index({ userId: 1, arrivalTime: 1 }, { unique: true });
appointmentSchema.index({ isRecurring: 1 });

// ── Virtuals ─────────────────────────────────────────────

appointmentSchema.virtual("Status").get(function () {
  if (this.startedTrip) {
    return "on the way";
  }
  if (this.arrivalTime < new Date()) {
    return "missed";
  }
  return "scheduled";
});

appointmentSchema.virtual("travelHours").get(function () {
  return +(this.estimatedTravelTime / 60).toFixed(1);
});

// ── Instance Methods ─────────────────────────────────────

appointmentSchema.methods.calculateTravelTime = async function () {
  const mapsService = require("../services/maps.service");

  const routeData = await mapsService.getDetailedRoute(
    this.startLocation.coordinates,
    this.destinationLocation.coordinates,
    this.transportation,
  );

  this.estimatedTravelTime = routeData.durationMinutes;
  this.polyline = routeData.polyline;
  this.stepsCount = routeData.stepsCount;
  this.caloriesBurned = routeData.caloriesBurned;
  this.DistanceInMeters = routeData.distanceValue;

  return this;
};
// ── Validation Hooks ─────────────────────────────────────
appointmentSchema.pre("save", async function (next) {
  if (this.isNew && this.arrivalTime < new Date()) {
    return next(new Error("Arrival time cannot be in the past"));
  }

  try {
    await this.calculateTravelTime();
  } catch (err) {
    return next(err);
  }

  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;
