const onlineUsers = new Map();

const addOnlineUser = (userId, socketId) => {
  onlineUsers.set(userId.toString(), socketId);
};

const removeOnlineUser = (socketId) => {
  for (const [userId, id] of onlineUsers.entries()) {
    if (id === socketId) {
      onlineUsers.delete(userId);
      break;
    }
  }
};

const getUserSocketId = (userId) => {
  return onlineUsers.get(userId.toString());
};

module.exports = {
  addOnlineUser,
  removeOnlineUser,
  getUserSocketId,
};