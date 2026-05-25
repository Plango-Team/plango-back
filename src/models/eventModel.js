const mongoose = require("mongoose");
const locationSchema = require("./locationSchema");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "music",
        "sports",
        "education",
        "technology",
        "photography",
        "art",
        "other",
      ],
      required: [true, "Category is required"],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: locationSchema,
      required: [true, "Event location is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date and time are required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date and time are required"],
    },
    images: {
      type: [String],
      default: ["default-event.jpg"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// indexs
eventSchema.index({ location: "2dsphere" });

eventSchema.index({ startDate: 1, category: 1 });

// ── Virtuals ─────────────────────────────────────────────
eventSchema.virtual("status").get(function () {
  if (!this.isActive) return "inactive";
  if (this.endDate < new Date()) return "expired";
  if (this.startDate > new Date()) return "upcoming";
  return "ongoing";
});

// ── Hooks ────────────────────────────────────────────────

const Event = mongoose.model("Event", eventSchema);
module.exports = Event;
