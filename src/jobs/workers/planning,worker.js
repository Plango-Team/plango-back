const { Worker } = require("bullmq");

const redisConnection = require("../redis");

const planningService = require("../../services/planning.service");

const planningWorker = new Worker(
  "planning",

  async (job) => {
    const { appointmentId } = job.data;

    const planningData =
      await planningService.calculatePlanning(
        appointmentId,
      );

    await planningService.savePlanning(
      planningData.appointment,
      planningData,
      false,
    );
  },

  {
    connection: redisConnection,
  },
);

planningWorker.on("completed", (job) => {
  console.log(
    `✅ Planning job completed: ${job.id}`
  );
});

planningWorker.on("failed", (job, error) => {
  console.log(
    `❌ Planning job failed: ${job?.id}`
  );

  console.log(error.message);
});

module.exports = planningWorker;