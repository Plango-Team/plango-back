const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/appointmentInvite.controllers");
const { protect, validate } = require("../middlewares");
const v = require("../validators/appointmentInvite.validators");

router.use(protect); 

router.get("/my-pending-invites", inviteController.getMyInvites);
router.post("/:id/invite", v.inviteUsers, validate, inviteController.inviteUsers);
router.put("/:id/accept", v.acceptInvite, validate, inviteController.acceptInvite);
router.put("/:id/decline", v.declineInvite, validate, inviteController.declineInvite);

router.delete("/delete-invite", v.deleteInviteValidator, validate, inviteController.deleteInvitation);

module.exports = router;