const IORedis = require("ioredis");

const { config } = require("../../config");

const redisConnection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,

  tls: {},
});

redisConnection.on("connect", () => {
  console.log("✅ Redis connected");
});

redisConnection.on("error", (error) => {
  console.log("❌ Redis Error:", error.message);
});

module.exports = redisConnection;