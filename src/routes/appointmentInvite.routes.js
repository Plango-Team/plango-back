const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/appointmentInvite.controllers");
const { protect } = require("../middlewares");

router.get("/",protect,inviteController.getMyInvites);
router.post("/:id/invite",protect,inviteController.inviteUsers);
router.patch("/:id/accept",protect,inviteController.acceptInvite);
router.patch("/:id/decline",protect,inviteController.declineInvite);


module.exports = router;