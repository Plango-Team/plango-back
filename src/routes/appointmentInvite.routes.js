const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/appointmentInvite.controllers");
const { protect } = require("../middlewares");

router.use(protect); 

router.get("/my-pending-invites", inviteController.getMyInvites);
router.post("/:id/invite", inviteController.inviteUsers);
router.put("/:id/accept",inviteController.acceptInvite);
router.put("/:id/decline",inviteController.declineInvite);


module.exports = router;