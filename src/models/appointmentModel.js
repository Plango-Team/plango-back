const mongoose = require("mongoose");
const locationSchema = require("./locationSchema");

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
    category: {
      type: String,
      enum: ["work", "personal", "travel", "other"],
      default: "personal",
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
      enum: ["car", "walking", "biking", "other"],
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
      index: true
    },
    arrivalBuffer: {
      type: Number,
      enum: [0, 5, 10, 15, 30],
      default: 0,
    },
    preparationTime: {
      type: Number,
      enum: [10, 20, 30, 45, 60],
      default: 0,
    },

  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

appointmentSchema.index({ userId: 1, arrivalTime: 1 },{unique: true});
// appointmentSchema.index({ userId: 1, status: 1 });
appointmentSchema.index({ isRecurring: 1 });

// ── Virtuals ─────────────────────────────────────────────
// appointmentSchema.virtual("suggestedDepartureTime").get(function () {
//   if (!this.arrivalTime || !this.estimatedTravelTime) return null;
//   return new Date(
//     this.arrivalTime.getTime() - this.estimatedTravelTime * 60 * 1000,
//   );
// });

// appointmentSchema.virtual("Status").get(function () {
//   if (this.isCompleted) {
//     return "completed";
//   }
//   if (this.arrivalTime < new Date()) {
//     return "missed";
//   }
//   return "scheduled";
// });

appointmentSchema.virtual("travelHours").get(function () {
  return +(this.estimatedTravelTime / 60).toFixed(1);
});

// ── Instance Methods ─────────────────────────────────────

// appointmentSchema.methods.calculateTravelTime = async function () {
//   const mapsService = require("../services/maps.service");

//   const travelData = await mapsService.getTravelEstimate(
//     this.startLocation.coordinates,
//     this.destinationLocation.coordinates,
//     this.transportation,
//   );

//   this.estimatedTravelTime = travelData.durationMinutes;
//   return this.estimatedTravelTime;
// };
// ── Validation Hooks ─────────────────────────────────────
appointmentSchema.pre("save", function (next) {
  if (this.isNew && this.arrivalTime < new Date()) {
    return next(new Error("Arrival time cannot be in the past"));
  }

  // if (this.arrivalTime < new Date() && this.status === "scheduled") {
  //   this.status = "missed";
  // }

  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;
