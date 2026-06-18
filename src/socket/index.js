const { Server } = require("socket.io");
const registerChatHandlers = require("./chat.handler");

const { config } = require("../config");
const { verifyToken } = require("../utils/helpers");

const {
  addOnlineUser,
  removeOnlineUser,
} = require("./onlineUsers");

let io;

const getTokenFromCookieHeader = (cookieHeader = "") => {
  const tokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("token="));

  if (!tokenCookie) {
    return null;
  }

  return decodeURIComponent(tokenCookie.slice("token=".length));
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        getTokenFromCookieHeader(socket.handshake.headers.cookie);

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error("Unauthorized"));
      }

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
    registerChatHandlers(io, socket);

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
