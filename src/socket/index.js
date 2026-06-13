const { Server } = require("socket.io");

const config = require("../config");
const { verifyToken } = require("../utils/helpers");

const {
  addOnlineUser,
  removeOnlineUser,
} = require("./onlineUsers");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = verifyToken(token);

      socket.user = decoded;

      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // console.log("✅ Socket user:",);
    // console.log(socket.user);
    addOnlineUser(socket.user.sub, socket.id);

    socket.on("disconnect", () => {
      removeOnlineUser(socket.id);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};