const { createMessage,checkAppointmentAccess } = require("../services/message.service");

const registerChatHandlers = (io, socket) => {
  socket.on(
    "joinAppointmentChat",

    async ({ appointmentId }) => {
      try {
        await checkAppointmentAccess(appointmentId, socket.user.sub);
        const room = `appointment:${appointmentId}`;
        socket.join(room);
      } catch (error) {
        socket.emit(
          "chatError",
          {
            message: error.message,
          },
        );
      }
    },
  );

  socket.on(
    "sendMessage",
    async ({
      appointmentId,
      content,
    }) => {
      try {
        await checkAppointmentAccess(appointmentId, socket.user.sub);
        const message = await createMessage({
          appointmentId,
          senderId: socket.user.sub,
          content,
        });

        const populatedMessage = await message.populate(
          "sender",
          "name profileImage",
        );

        io.to(`appointment:${appointmentId}`).emit(
          "newMessage",
          populatedMessage,
        );

      } catch (error) {
        socket.emit(
          "chatError",
          {
            message: error.message,
          },
        );
      }
    },
  );
};

module.exports = registerChatHandlers;
