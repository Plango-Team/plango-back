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
        required: [true, "sender id is required"],
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
        enum: ["car", "walking", "biking", "other"],
    },

    estimatedTravelTime: {
        type: Number,
    },

    startLocation: {
        type: locationSchema,
    },

    joinedAt: {
        type: Date,
    },
},
    { timestamps: true }
);

// prevent duplicate invites for same appointment
appointmentInviteSchema.index(
{ appointmentId: 1, receiverId: 1 },
{ unique: true }
);

const AppointmentInvite = mongoose.model(
"AppointmentInvite",
appointmentInviteSchema
);

module.exports = AppointmentInvite;