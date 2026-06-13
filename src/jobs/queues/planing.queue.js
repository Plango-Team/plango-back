const { Queue } = require("bullmq");

const redisConnection = require("../redis");

const planningQueue = new Queue("planning", {
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

const addPlanningJob = async (
  appointmentId,
  delay,
) => {
  return planningQueue.add(
    "recalculate-planning",
    {
      appointmentId,
    },
    {
      delay,
    },
  );
};

const removePlanningJob = async (jobId) => {
  const job = await planningQueue.getJob(jobId);

  if (job) {
    await job.remove();
  }
};

module.exports = planningQueue;

module.exports.addPlanningJob =
  addPlanningJob;

module.exports.removePlanningJob =
  removePlanningJob;