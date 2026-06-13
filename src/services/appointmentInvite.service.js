const AppointmentInvite = require("../models/appointmentInvite.model");
const Appointment = require("../models/appointmentModel");
const AppError = require("../utils/appError");
const User = require("../models/user.model");
const mapsService = require("../services/maps.service");


const inviteUsers = async ({ appointmentId, ownerId, invitedUsernames }) => {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new AppError("No appointment found with that ID", 404, "APPOINTMENT_NOT_FOUND");   
    }

    if (!appointment.userId.equals(ownerId)) {
        throw new AppError("Unauthorized", 403);
    }

    const errors = [];

    
    const invitePromises = invitedUsernames.map(async (username) => {
        const invitedUser = await User.findOne({ username: username });
        if (!invitedUser) {
            errors.push(`User ${username} not found`);
            return null;
        }
        
        const invitedUserId = invitedUser._id;
        
        if (appointment.userId.equals(invitedUserId)) {
            errors.push(`You cannot invite yourself (${username})`);
            return null;
        }

        const alreadyInvited = await AppointmentInvite.findOne({
            appointmentId,
            receiverId: invitedUserId,
        });
        if (alreadyInvited) {
            errors.push(`User ${username} is already invited`);
            return null;
        }

    
        return await AppointmentInvite.create({
            appointmentId,
            senderId: ownerId,
            receiverId: invitedUserId,
            status: "pending"
        });
    });

    const results = await Promise.all(invitePromises);
    
    const createdInvites = results.filter(invite => invite !== null);
    
    if (createdInvites.length === 0 && errors.length > 0) {
        throw new AppError(errors.join(", "), 400, "INVITATION_FAILED");
    }
    
    return { createdInvites, errors };
};


const acceptInvite = async ({ appointmentId, userId, startLocation, transportation }) => {
    const invite = await AppointmentInvite.findOne({ appointmentId, receiverId: userId });
    if (!invite) {
        throw new AppError("Invite not found", 404, "INVITE_NOT_FOUND");
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new AppError("Appointment not found", 404);
    }
    
    if (invite.status === "accepted") throw new AppError("Invite already accepted", 400, "ALREADY_ACCEPTED");
    if (invite.status === "declined") throw new AppError("Invite already declined", 400, "ALREADY_DECLINED");
    if (appointment.arrivalTime < new Date()) throw new AppError("Cannot accept invite after appointment time", 400, "APPOINTMENT_PAST");
    
    
    const transportationMap = {
        'car': 'driving',
        'driving': 'driving',
        'walking': 'walking',
        'biking': 'bicycling',
        'bicycling': 'bicycling',
        'other': 'other'  
    };
    const internalTransportMode = transportationMap[transportation] || 'driving';

    let calculatedTime = 0;
    let polyline = "";
    let stepsCount = null;
    let caloriesBurned = null;
    let distanceInMeters = null;

    try {
        const routeData = await mapsService.getDetailedRoute(
            startLocation.coordinates,
            appointment.destinationLocation.coordinates,
            internalTransportMode
        );
        
        if (!routeData || routeData.durationMinutes === undefined) {
            throw new AppError("Maps API returned invalid route data", 500);
        }
        
        calculatedTime = routeData.durationMinutes;
        polyline = routeData.polyline || "";
        stepsCount = routeData.stepsCount || null;
        caloriesBurned = routeData.caloriesBurned || null;
        distanceInMeters = routeData.distanceValue || null; // ✨ جلب المسافة لليوزر المدعو
        
    } catch (err) {
        throw new AppError(`Failed to calculate travel time: ${err.message}`, err.status || 500);
    }


    invite.startLocation = startLocation;
    invite.transportation = internalTransportMode; 
    invite.estimatedTravelTime = calculatedTime; 
    invite.polyline = polyline;
    invite.stepsCount = stepsCount;
    invite.caloriesBurned = caloriesBurned;
    invite.distanceInMeters = distanceInMeters; 
    invite.status = "accepted";
    invite.joinedAt = new Date();

    await invite.save();
    
    const inviteObj = invite.toObject({ virtuals: true });
    inviteObj.travelHours = +((calculatedTime || 0) / 60).toFixed(1);
    
    return inviteObj;
};

// ── رفض الدعوة ─────────────────────────────────────────────
const declineInvite = async ({ appointmentId, userId }) => {
    const invite = await AppointmentInvite.findOne({ appointmentId, receiverId: userId });
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

    if (invite.status === "declined") throw new AppError("Invite already declined", 400, "ALREADY_DECLINED");
    if (invite.status === "accepted") throw new AppError("Invite already accepted", 400, "ALREADY_ACCEPTED");

    invite.status = "declined";
    await invite.save();

    return invite;
};


const getMyInvites = async ({ userId }) => {
    return await AppointmentInvite.find({ receiverId: userId, status: "pending" })
        .populate({
            path: "appointmentId",
            select: "title description arrivalTime destinationLocation" 
        })
        .populate({
            path: "senderId",
            select: "name username"
        })
        .sort({ createdAt: -1 }); 
};


const cancelInvite = async ({ appointmentId, receiverId, ownerId }) => {
    const invite = await AppointmentInvite.findOne({ appointmentId, receiverId });
    if (!invite) {
        throw new AppError("Invitation not found", 404);
    }

    if (invite.senderId.equals(ownerId) || invite.receiverId.equals(ownerId)) {
        await AppointmentInvite.findByIdAndDelete(invite._id);
        return { success: true };
    }
    
    throw new AppError("Unauthorized to cancel this invitation", 403);
};

module.exports = { inviteUsers, acceptInvite, declineInvite, getMyInvites, cancelInvite };