const mongoose = require("mongoose");
const locationSchema = require("./locationSchema");

const appointmentInviteSchema = new mongoose.Schema(
    {
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: [true, "appointment id is required"],
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "receiver id is required"],
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending",
    },
    transportation: {
        type: String,
        enum: ['driving', 'walking', 'bicycling', 'other'],
    },
    estimatedTravelTime: {
        type: Number,
      default: 0, // ✨ تأمين: قيمة مبدئية عشان الحسابات والـ Virtuals
    },
    startLocation: {
        type: locationSchema,
    },
    joinedAt: {
        type: Date,
    },
    polyline: {
        type: String,
        default: "",
    },
    stepsCount: {
        type: Number,
        default: null,
    },
    caloriesBurned: {
        type: Number,
        default: null,
    },
    },
    { 
    timestamps: true,
    toJSON: { virtuals: true },  
    toObject: { virtuals: true }
    }
);


appointmentInviteSchema.index(
    { appointmentId: 1, receiverId: 1 },
    { unique: true }
);


appointmentInviteSchema.virtual("travelHours").get(function () {

    const minutes = this.estimatedTravelTime || 0;
    return +(minutes / 60).toFixed(1);
});

const AppointmentInvite = mongoose.model("AppointmentInvite", appointmentInviteSchema);
module.exports = AppointmentInvite;