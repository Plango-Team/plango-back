const authService = require('../services/auth.service');
const { catchAsync, sendSuccess } = require('../utils/helpers');
const { config } = require('../config');
const { t } = require('../utils/i18n');

// ── Registration ──────────────────────────────────────────

exports.register = catchAsync(async (req, res) => {
  const { name, email, password, role, phone , location , isPrivate , username , bio} = req.body;
  const user = await authService.register({ name, email, password, role, phone, location, isPrivate, username, bio } , req.lang);
  sendSuccess(res, 201, t(req.lang, 'REGISTER_SUCCESS'), { user });
});

exports.verifyEmail = catchAsync(async (req, res) => {
  const user = await authService.verifyEmail(req.query.token , req.lang);
  sendSuccess(res, 200, t(req.lang, 'EMAIL_VERIFIED'), { user });
});

exports.resendVerification = catchAsync(async (req, res) => {
  await authService.resendVerification(req.body.email , req.lang);
  // Always return success to prevent email enumeration
  sendSuccess(res, 200, t(req.lang, 'RESEND_VERIFICATION'));
});

// ── Login ─────────────────────────────────────────────────

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body , req.lang);
  sendSuccess(res, 200, t(req.lang, 'LOGIN_SUCCESS'), result);
});

// ── Google OAuth ──────────────────────────────────────────

// Called after passport.authenticate succeeds — req.user is the Google user
exports.googleCallback = catchAsync(async (req, res) => {
  const result = await authService.googleLogin(req.user , req.lang);

  // Keep the cookie for same-site clients, while the fragment below supports
  // cross-site deployments where browsers block third-party cookies.
  res.cookie('token', result.token, {
    httpOnly: true,                          
    secure: config.isProd,                   
    sameSite: config.isProd ? 'none' : 'lax', 
    maxAge: 7 * 24 * 60 * 60 * 1000,        // 7 days in milliseconds
  });

  
  // res.cookie('token', result.token, {
  //   httpOnly: true,
  //   secure: false,
  //   sameSite: 'lax',
  //   maxAge: 7 * 24 * 60 * 60 * 1000,
  // })
  // .status(200).json({
  //   success: true,
  //   message: 'Login Successful',
  //   data: result,
  // });

  const callbackUrl = new URL('/auth/callback', config.clientUrl);
  callbackUrl.hash = `token=${encodeURIComponent(result.token)}`;
  res.redirect(callbackUrl.toString());

});

// ── Password Reset ────────────────────────────────────────

exports.forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email,req.lang);
  sendSuccess(res, 200, t(req.lang, 'FORGOT_PASSWORD_EMAIL'));
});

exports.forgotPasswordOtp = catchAsync(async (req, res) => {
  await authService.forgotPasswordOtp(req.body.phone ,req.lang);
  sendSuccess(res, 200, t(req.lang, 'FORGOT_PASSWORD_OTP'));

});

exports.resetPasswordWithToken = catchAsync(async (req, res) => {
  await authService.resetPasswordWithToken(req.body.token, req.body.newPassword , req.lang);
  sendSuccess(res, 200, t(req.lang, 'RESET_PASSWORD_SUCCESS'));
});

exports.resetPasswordWithOtp = catchAsync(async (req, res) => {
  await authService.resetPasswordWithOtp(req.body.phone, req.body.otp, req.body.newPassword , req.lang);
  sendSuccess(res, 200, t(req.lang, 'RESET_PASSWORD_SUCCESS'));
});

// ── Authenticated Actions ─────────────────────────────────

exports.getMe = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.user._id , req.lang);
  sendSuccess(res, 200, t(req.lang, 'PROFILE_RETRIEVED'), { user });
});

exports.changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword , req.lang);
sendSuccess(res, 200, t(req.lang, 'CHANGE_PASSWORD_SUCCESS'));
});

// ── Phone Verification ────────────────────────────────────

exports.sendPhoneOtp = catchAsync(async (req, res) => {
  await authService.sendPhoneOtp(req.user._id, req.body.phone , req.lang);
  sendSuccess(res, 200, t(req.lang, 'OTP_SENT'));
});

exports.verifyPhone = catchAsync(async (req, res) => {
  const user = await authService.verifyPhone(req.user._id, req.body.phone, req.body.otp , req.lang);
  sendSuccess(res, 200, t(req.lang, 'PHONE_VERIFIED'), { user });
});

// ── Email Change ──────────────────────────────────────────

exports.requestEmailChange = catchAsync(async (req, res) => {
  await authService.requestEmailChange(req.user._id, req.body.newEmail , req.body.password , req.lang);
  sendSuccess(res, 200, t(req.lang, 'EMAIL_CHANGE_REQUESTED'));
});

exports.confirmEmailChange = catchAsync(async (req, res) => {
  await authService.confirmEmailChange(req.query.token , req.lang);
  sendSuccess(res, 200, t(req.lang, 'EMAIL_CHANGE_SUCCESS'));
});

// ── Phone Change ──────────────────────────────────────────

exports.requestPhoneChange = catchAsync(async (req, res) => {
  await authService.requestPhoneChange(req.user._id, req.body.newPhone , req.body.password , req.lang);
  sendSuccess(res, 200, t(req.lang, 'PHONE_CHANGE_REQUESTED'));
});

exports.confirmPhoneChange = catchAsync(async (req, res) => {
  await authService.confirmPhoneChange(req.user._id, req.body.otp , req.lang);
  sendSuccess(res, 200, t(req.lang, 'PHONE_CHANGE_SUCCESS'));
});

exports.updateName = catchAsync(async (req, res) => {
  const user = await authService.updateName(req.user._id, req.body.name, req.lang);
  sendSuccess(res, 200, t(req.lang, 'NAME_UPDATED'), { user });
});

exports.deleteAccount = catchAsync(async (req, res) => {
  await authService.deleteAccount(req.user._id, req.body.password, req.lang);
  sendSuccess(res, 200, t(req.lang, 'ACCOUNT_DELETED'));
});


exports.checkUsername = catchAsync(async (req, res) => {
  const isAvailable = await authService.checkUsername(req.query.username);
  sendSuccess(res, 200, t(req.lang, 'USERNAME_CHECKED'), { isAvailable });
});
