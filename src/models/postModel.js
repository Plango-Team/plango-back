const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "post content is required"],
      trim: true,
      minlength: [1, "post content must be at least 1 character"],
      maxlength: [500, "post content cannot exceed 500 characters"],
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user id is required"],
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

postSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);