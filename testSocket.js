const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", {
  transports: ["websocket"],

  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YTA2NWExYTljNjQ0YmMxZDI1Yjg5ZDciLCJyb2xlIjoidXNlciIsImlhdCI6MTc3OTY2OTgyNywiZXhwIjoxNzgwMjc0NjI3fQ.evXwAMsmpjfanOn7GJ13HSbXEFTuwPg_eCb3i4A8-_g",
  },
});

socket.on("connect", () => {

  console.log("✅ Connected");

  console.log("Socket ID:", socket.id);

});

socket.on("notification:new", (notification) => {

  console.log("🔔 New Notification:");

  console.log(notification);

});

socket.on("connect_error", (error) => {

  console.log("❌ Connection Error:");

  console.log(error.message);

});