const express = require('express');
const passport = require('passport');
const router = express.Router();

const ctrl = require('../controllers/auth.controller');
const { config } = require('../config');
const { protect, restrictTo, validate, rateLimiters } = require('../middlewares');
const v = require('../validators/auth.validators');

// Shortcuts to keep route definitions short
const { auth, otp, reset, resend , nameChange , phoneChange , changePassword , emailChange} = rateLimiters;


// ── Registration ──────────────────────────────────────────
router.post('/register',auth, v.validateRegister,validate, ctrl.register);
router.get('/verify-email',ctrl.verifyEmail);
router.post('/resend-verification', resend, v.validateResendVerification, validate, ctrl.resendVerification);

// ── Login ─────────────────────────────────────────────────
router.post('/login', auth, v.validateLogin, validate, ctrl.login);

// ── Google OAuth ──────────────────────────────────────────
// Step 1: redirect user to Google's login page
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Step 2: Google redirects back here after user approves
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.clientUrl}/auth/login?error=google_failed`,
  }),
  ctrl.googleCallback
);

// ── Password Reset via Email ──────────────────────────────
router.post('/forgot-password',reset, v.validateForgotPassword,validate, ctrl.forgotPassword);
router.post('/reset-password/token', reset, v.validateResetPasswordToken,validate, ctrl.resetPasswordWithToken);

// ── Password Reset via WhatsApp OTP ──────────────────────
router.post('/forgot-password/otp',otp,v.validateForgotPasswordOtp,validate, ctrl.forgotPasswordOtp);
router.post('/reset-password/otp',reset, v.validateResetPasswordOtp,validate, ctrl.resetPasswordWithOtp);


// ── Profile ───────────────────────────────────────────────
router.get('/me', protect, ctrl.getMe);

// ── Password Change ───────────────────────────────────────
router.post('/change-password',
  protect,
  ...changePassword,
  v.validateChangePassword, validate,
  ctrl.changePassword
);

// ── Phone Verification ────────────────────────────────────
router.post('/phone/send-otp',
  protect,
  otp, v.validateSendPhoneOtp, validate,
  ctrl.sendPhoneOtp
);

router.post('/phone/verify',
  protect,
  otp, v.validateVerifyPhone, validate,
  ctrl.verifyPhone
);

// ── Email Change ──────────────────────────────────────────
// Cooldown is enforced inside the service
router.post('/email/change',
  protect,
  ...emailChange,
  v.validateRequestEmailChange, validate,
  ctrl.requestEmailChange
);

// Token arrives via query string in the link: ?token=abc123
router.get('/email/confirm-change',
  v.validateConfirmEmailChange, validate,
  ctrl.confirmEmailChange
);

// ── Phone Change ──────────────────────────────────────────
// Cooldown is enforced inside the service
router.post('/phone/change',
  protect,
  ...phoneChange, v.validateRequestPhoneChange, validate,
  ctrl.requestPhoneChange
);

router.post('/phone/confirm-change',
  protect,
  otp, v.validateConfirmPhoneChange, validate,
  ctrl.confirmPhoneChange
);

// ── Delete Account ──────────────────────────────────────────
router.delete('/delete-account',
  protect,
  ctrl.deleteAccount
);

router.get('/check-username', v.validateCheckUsername, validate, ctrl.checkUsername);

router.patch('/update-name',
  protect,
  ...nameChange,
  v.validateUpdateName,
  validate,
  ctrl.updateName
);

// ── Admin-only Example ────────────────────────────────────
router.get('/admin/ping',
  protect, restrictTo('admin'),
  (_req, res) => res.json({ status: 'success', message: 'Admin access confirmed.' })
);

module.exports = router;
