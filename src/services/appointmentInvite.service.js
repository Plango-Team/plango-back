const AppointmentInvite = require("../models/appointmentInvite.model");
const Appointment = require("../models/appointmentModel");
const AppError = require("../utils/appError");
const User = require("../models/user.model");


const inviteUsers = async ({ appointmentId, ownerId, invitedUserId }, lang) => {
    // check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
if (!appointment) {
    throw new AppError("No appointment found with that ID", 404,"APPOINTMENT_NOT_FOUND");   
}

if (!appointment.userId.equals(ownerId)) {
    throw new AppError("Unauthorized", 403);
}
// owner cannot invite himself
if (appointment.userId.equals(invitedUserId)) {
    throw new AppError("You are already the owner",400);
}
// check if invitedUser exists
const userExists = await User.findById(invitedUserId);
if (!userExists) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
}
// check if already invited this user
const alreadyInvited = await AppointmentInvite.findOne({appointmentId,receiverId: invitedUserId,
});
if (alreadyInvited) {
    throw new AppError("User already invited", 400, "USER_ALREADY_INVITED");
}
// create invite
    const invite = await AppointmentInvite.create({appointmentId,senderId: ownerId,
    receiverId: invitedUserId,
    });

    return invite;
}

const acceptInvite = async ({ appointmentId, userId }) => {
    const invite = await AppointmentInvite.findOne({appointmentId,
    receiverId: userId,});
    if (!invite) {
        throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
    throw new AppError("Appointment not found", 404);
    }
    // check if already accepted
    if (invite.status === "accepted") {
    throw new AppError("Invite already accepted", 400, "ALREADY_ACCEPTED");
    }
    //check if already declined
    if (invite.status === "declined") {
    throw new AppError("Invite already declined", 400, "ALREADY_DECLINED");
    } 
    //check if appointment time already passed
    if (appointment.arrivalTime < new Date()) {
    throw new AppError("Cannot accept invite after appointment time", 400, "APPOINTMENT_PAST");
    }
    // accept invite
    invite.status = "accepted";
    invite.joinedAt = new Date();

    await invite.save();
    
    return invite;
}

const declineInvite = async ({ appointmentId, userId }) => {

    const invite = await AppointmentInvite.findOne({
    appointmentId,
    receiverId: userId,
    });

    if (!invite) {
    throw new AppError("Invite not found", 404);
    }

    if (invite.status === "declined") {
    throw new AppError("Invite already declined", 400, "ALREADY_DECLINED");
    }

    if (invite.status === "accepted") {
    throw new AppError("Invite already accepted", 400, "ALREADY_ACCEPTED");
    }

    invite.status = "declined";

    await invite.save();

    return invite;
};

const getMyInvites = async ({ userId }) => {

    const invites = await AppointmentInvite.find({receiverId: userId,})
    .populate("appointmentId")
    .populate("senderId");

    return invites;
};
module.exports = {inviteUsers, acceptInvite, declineInvite, getMyInvites};