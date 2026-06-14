const { Queue } = require("bullmq");

const redisConnection = require("../redis");

const notificationQueue = new Queue("notifications", {
  connection: redisConnection,

  defaultJobOptions: {
    removeOnComplete: 50,

    removeOnFail: 100,

    attempts: 3,

    backoff: {
      type: "exponential",

      delay: 3000,
    },
  },
});

module.exports = notificationQueue;

const removeNotificationJob = async (jobId) => {
  const job = await notificationQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
};

module.exports.removeNotificationJob = removeNotificationJob;