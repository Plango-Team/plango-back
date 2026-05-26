const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [ true, "Recipient is required" ],
    },

    type: {
      type: String,
      required: [ true, "Type is required" ],
      trim: true,
    },

    title: {
      type: String,
      required: [ true, "Title is required" ],
      trim: true,
    },

    message: {
      type: String,
      required: [ true, "Message is required" ],
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    channels: [
      {
        type: String,
        enum: ["IN_APP", "PUSH", "EMAIL"],
        default: "IN_APP",
      },
    ],

    scheduledFor: {
      type: Date,
    },

    sentAt: {
      type: Date,
    },

    jobId: {
      type: String,
    },

    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ scheduledFor: 1 });

module.exports = mongoose.model("Notification", notificationSchema);