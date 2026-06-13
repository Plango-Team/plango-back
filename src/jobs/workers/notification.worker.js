const { Worker } = require("bullmq");

const redisConnection = require("../redis");

const { getIO } = require("../../socket");
const { getUserSocketId } = require("../../socket/onlineUsers");
const admin = require("../../firebase");
const User = require("../../models/user.model");
const notificationWorker = new Worker(
  "notifications",

  async (job) => {
    const notification = job.data;

    const socketId = getUserSocketId(notification.recipient);

    if (socketId) {
      const io = getIO();

      io.to(socketId).emit("notification:new", notification);
      const user = await User.findById(notification.recipient);

      if (user?.fcmToken?.length > 0) {
        if (user?.fcmTokens?.length) {
          const response = await admin.messaging().sendEachForMulticast({
            tokens: user.fcmTokens,

            notification: {
              title: notification.title,

              body: notification.message,
            },

            data: {
              type: notification.type,
            },
          });

          const invalidTokens = [];

          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              invalidTokens.push(user.fcmTokens[index]);
            }
          });

          if (invalidTokens.length) {
            await User.findByIdAndUpdate(user._id,
              {
                $pull: {
                  fcmTokens: {
                    $in: invalidTokens,
                  },
                },
              },
            );
          }
        }
      }
    }
  },

  {
    connection: redisConnection,
  },
);

notificationWorker.on("completed", (job) => {
  console.log(`✅ Notification job completed: ${job.id}`);
});

notificationWorker.on("failed", (job, error) => {
  console.log(`❌ Notification job failed: ${job?.id}`);

  console.log(error.message);
});

module.exports = notificationWorker;
