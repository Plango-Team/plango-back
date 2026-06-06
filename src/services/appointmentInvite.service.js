const AppointmentInvite = require("../models/appointmentInvite.model");
const Appointment = require("../models/appointmentModel");
const AppError = require("../utils/appError");
const User = require("../models/user.model");


const inviteUsers = async ({ appointmentId, ownerId, invitedUsernames }) => {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new AppError("No appointment found with that ID", 404, "APPOINTMENT_NOT_FOUND");   
    }
    // user must be the owner of the appointment to send invites
    if (!appointment.userId.equals(ownerId)) {
    throw new AppError("Unauthorized", 403);
}

    const createdInvites = [];
    const errors = [];

    // process each invited username
    const invitePromises = invitedUsernames.map(async (username) => {
        const invitedUser = await User.findOne({ username: username });
        if (!invitedUser) {
            errors.push(`User ${username} not found`);
            return;
        }
        
        const invitedUserId = invitedUser._id;
        // prevent inviting oneself
        if (appointment.userId.equals(invitedUserId)) {
            errors.push(`You cannot invite yourself (${username})`);
            return;
        }
        // check if already invited
        const alreadyInvited = await AppointmentInvite.findOne({
            appointmentId,
            receiverId: invitedUserId,
        });
        if (alreadyInvited) {
            errors.push(`User ${username} is already invited`);
            return;
        }
        // create invite
        const invite = await AppointmentInvite.create({
            appointmentId,
            senderId: ownerId,
            receiverId: invitedUserId,
            status: "pending"
        });

        createdInvites.push(invite);
    });

    await Promise.all(invitePromises);
    
    if (createdInvites.length === 0 && errors.length > 0) {
        throw new AppError(errors.join(", "), 400, "INVITATION_FAILED");
    }
    
    return { createdInvites, errors };
}

const acceptInvite = async ({ appointmentId, userId, startLocation, transportation }) => {
    //check required fields
    if (!startLocation || !transportation) {
        throw new AppError("Start location and transportation are required to accept the invite", 400);
    }

    const invite = await AppointmentInvite.findOne({ appointmentId, receiverId: userId });
    if (!invite) {
        throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new AppError("Appointment not found", 404);
    }
    
    // check if invite is already accepted or declined, or if appointment time has passed
    if (invite.status === "accepted") throw new AppError("Invite already accepted", 400, "ALREADY_ACCEPTED");
    if (invite.status === "declined") throw new AppError("Invite already declined", 400, "ALREADY_DECLINED");
    if (appointment.arrivalTime < new Date()) throw new AppError("Cannot accept invite after appointment time", 400, "APPOINTMENT_PAST");
    
    //calculate estimated travel time
    let calculatedTime = 0;
    try {
        
        calculatedTime = 25;
    } catch (err) {
        console.error("Maps service error:", err);
    }

    // update invite status and travel details
    invite.startLocation = startLocation;
    invite.transportation = transportation;
    invite.estimatedTravelTime = calculatedTime; 
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

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
    }

    if (appointment.arrivalTime < new Date()) {
        throw new AppError("Cannot decline invite after appointment time", 400, "APPOINTMENT_PAST");
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
    // Fetch invites where status is pending
    const invites = await AppointmentInvite.find({
        receiverId: userId,
        status: "pending"
    })
    .populate({
        path: "appointmentId",
        select: "title description arrivalTime destinationLocation" 
    })
    .populate({
        path: "senderId",
        select: "name username "
    }).sort({ createdAt: -1 }); 

    return invites;
};
module.exports = {inviteUsers, acceptInvite, declineInvite, getMyInvites};