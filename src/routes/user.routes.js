const express = require("express");
const router = express.Router();
const usrctlr = require("../controllers/usersControllers");
const { protect, validate } = require("../middlewares");
const v = require("../validators/appointment.validators");

// ── Public Routes ─────────────────────────────────────────
router.get("/search", protect, usrctlr.searchUsers);
router.get("/:id/profile", protect, usrctlr.getUserProfile);

// ── Protected Routes ──────────────────────────────────────
router.use(protect);

router.get("/", usrctlr.getUsers);
router.post("/", usrctlr.createUser);

router.get("/:id", usrctlr.getUser);
router.put("/updateMe", usrctlr.updateMe);
router.delete("/:id", usrctlr.deleteUser);

module.exports = router;
