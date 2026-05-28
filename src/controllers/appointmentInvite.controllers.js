const appointmentInviteService = require("../services/appointmentInvite.service");
const AppError = require("../utils/appError");
const catchAsync = require("express-async-handler");
const { sendSuccess } = require("../utils/helpers");
const { Result } = require("express-validator");
const { t } = require('../utils/i18n');

exports.inviteUsers = catchAsync(async (req, res) => {
    const invite = await appointmentInviteService.inviteUsers({
    appointmentId: req.params.id,ownerId: req.user._id,
    invitedUserId: req.body.userId,}, req.lang);

    sendSuccess(res,200,t(req.lang, "INVITATION_SENT"),{ invite });
});

exports.acceptInvite = catchAsync(async (req, res) => {
    const invite = await appointmentInviteService.acceptInvite({
    appointmentId: req.params.id,
    userId: req.user._id,});

    sendSuccess(res,200,t(req.lang, "INVITE_ACCEPTED"),{ invite });
});

exports.declineInvite = catchAsync(async (req, res) => {
    const invite = await appointmentInviteService.declineInvite({
    appointmentId: req.params.id,
    userId: req.user._id,});
    sendSuccess(res,200,t(req.lang, "INVITE_DECLINED"),{ invite });
});

exports.getMyInvites = catchAsync(async (req, res) => {

    const invites = await appointmentInviteService.getMyInvites({
    userId: req.user._id,
    lang: req.lang,});

    console.log("USER:", req.user);
console.log("USER ID:", req.user._id);
    sendSuccess(
    res,
    200,
    t(req.lang, "INVITES_FETCHED"),
    { invites }
    );
});
