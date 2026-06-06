const appointmentInviteService = require("../services/appointmentInvite.service");
const AppError = require("../utils/appError");
const catchAsync = require("express-async-handler");
const { sendSuccess } = require("../utils/helpers");
const { Result } = require("express-validator");
const { t } = require('../utils/i18n');

exports.inviteUsers = catchAsync(async (req, res, next) => {

    const { createdInvites, errors } = await appointmentInviteService.inviteUsers({
        appointmentId: req.params.id,       
        ownerId: req.user._id,              
        invitedUsernames: req.body.usernames 
    }, req.lang);

    sendSuccess(res, 200, t(req.lang, "INVITATION_SENT_SUCCESSFULLY"), { 
        invites: createdInvites,
        warnings: errors.length > 0 ? errors : undefined
    });
});

exports.acceptInvite = catchAsync(async (req, res, next) => {
    const invite = await appointmentInviteService.acceptInvite({
        appointmentId: req.params.id,           
        userId: req.user._id,                   
        startLocation: req.body.startLocation,  
        transportation: req.body.transportation 
    });

    sendSuccess(res, 200, t(req.lang, "INVITE_ACCEPTED_SUCCESSFULLY"), { invite });
});

exports.declineInvite = catchAsync(async (req, res, next) => {
    const invite = await appointmentInviteService.declineInvite({
        appointmentId: req.params.id, 
        userId: req.user._id       
    });

    sendSuccess(res, 200, t(req.lang, "INVITE_DECLINED_SUCCESSFULLY"), { invite });
});

exports.getMyInvites = catchAsync(async (req, res, next) => {
    const invites = await appointmentInviteService.getMyInvites({
        userId: req.user._id 
    });

    sendSuccess(res, 200, t(req.lang, "SUCCESS"), {
        results: invites.length,
        invites
    });
});
