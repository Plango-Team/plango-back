const User = require('../models/user.model');
const Follow = require('../models/followModel');
const AppError = require('../utils/appError');
const bcrypt = require("bcryptjs");
const { hashValue, randomToken, signToken, hoursFromNow } = require('../utils/helpers');
const { sendOtp, verifyOtp } = require('./otp.service');
const emailService = require('./email.service');
const { config } = require('../config');
const { t } = require('../utils/i18n');

const PRIVATE_FIELDS = '+password +otp +otpExpires +otpType +emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires +emailChangeToken +emailChangeExpires +newEmail +newPhone +passwordChangedAt +isActive';

const buildUrl = (path, token) => `${config.clientUrl}/${path}?token=${token}`;

// ── Guards (shared checks used in multiple places) ────────

// Throw if account is deactivated
const checkIsActive = (user) => {
  if (!user.isActive) {
    throw new AppError(t(user.lang, 'DEACTIVATED'), 403, 'DEACTIVATED');
  }
};

// Throw if email isn't verified yet
const checkEmailVerified = (user, lang) => {
  if (!user.isEmailVerified) {
    throw new AppError(t(lang, 'EMAIL_NOT_VERIFIED'), 403, 'EMAIL_NOT_VERIFIED');
  }
};

// ── Per-action cooldown check ─────────────────────────────
const checkCooldown = (allowedAt, actionLabel, lang) => {
  if (!allowedAt || allowedAt <= Date.now()) return; // no cooldown active
  const hours = Math.ceil((allowedAt - Date.now()) / (1000 * 60 * 60));
  throw new AppError(
    t(lang, 'ACTION_COOLDOWN', { hours }),
    429,
    'ACTION_COOLDOWN'
  );
};

// ── Auth Actions ──────────────────────────────────────────

// Register a new user
const register = async ({ name, email, password, role = 'user', phone, location, lang , isPrivate , username, bio}) => {
  // Make sure no one already has this email
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(t(lang , 'EMAIL_TAKEN'), 409, 'EMAIL_TAKEN');
  }

  // Create a random token, hash it, and store the hash
  // We email the raw token — only the hash lives in DB
  const rawToken = randomToken();
  const hashedToken = hashValue(rawToken);

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    provider: 'local',
    emailVerificationToken: hashedToken,
    emailVerificationExpires: hoursFromNow(24),
    location,
    isPrivate,
    username,
    bio,
  });

  // Send verification link with the raw token
  /*const url = buildUrl('verify-email', rawToken);
  await emailService.sendVerificationEmail(user, url, lang);*/

  return user.toSafeObject();
};

// Verify email from the link clicked in the inbox
const verifyEmail = async (rawToken, lang) => {
  const hashedToken = hashValue(rawToken);

  // Find user with this token who hasn't expired yet
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError(t(lang, 'VERIFY_EMAIL_INVALID'), 400, 'INVALID_TOKEN');
  }

  // Mark email as verified and clear the token
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return user.toSafeObject();
};

// Resend a new verification email
const resendVerification = async (email, lang) => {
  const user = await User.findOne({ email });

  // Return silently even if user not found — prevents email enumeration
  if (!user || user.isEmailVerified || user.provider !== 'local') return;

  const rawToken = randomToken();
  user.emailVerificationToken = hashValue(rawToken);
  user.emailVerificationExpires = hoursFromNow(24);
  await user.save({ validateBeforeSave: false });

  await emailService.sendVerificationEmail(user, buildUrl('verify-email', rawToken), lang);
};

// Log in with email + password
const login = async ({ email, password } , lang) => {
  // Fetch user with password (hidden by default)
  const user = await User.findOne({ email }).select(PRIVATE_FIELDS);

  // Always run comparePassword even if user is null — prevents timing attacks
  const passwordMatch = user ? await user.comparePassword(password) : false;


  if (!user || !passwordMatch) {
    throw new AppError(t(lang, 'INVALID_CREDENTIALS'), 401, 'INVALID_CREDENTIALS');
  }
  checkIsActive(user, lang);
  //checkEmailVerified(user, lang);

  if (user.provider !== 'local') {
    throw new AppError(t(lang, 'WRONG_PROVIDER'), 400, 'WRONG_PROVIDER');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Issue a single JWT — no refresh token needed
  const token = signToken(user._id.toString(), user.role);
  return { user: user.toSafeObject(), token };
};

// Called after Google OAuth succeeds — issue a single JWT
const googleLogin = async (googleUser, lang) => {
  checkIsActive(googleUser, lang);

  googleUser.lastLoginAt = new Date();
  await googleUser.save({ validateBeforeSave: false });

  const token = signToken(googleUser._id.toString(), googleUser.role);
  return { user: googleUser.toSafeObject(), token };
};

// Send a password reset link via email
const forgotPassword = async (email, lang) => {
  const user = await User.findOne({ email });

  // Silent success — don't reveal whether email exists
  if (!user || user.provider !== 'local') return;

  const rawToken = randomToken();
  user.passwordResetToken = hashValue(rawToken);
  user.passwordResetExpires = hoursFromNow(1);
  await user.save({ validateBeforeSave: false });

  await emailService.sendPasswordResetEmail(user, buildUrl('reset-password', rawToken), lang);
};

// Send a password reset OTP via WhatsApp
const forgotPasswordOtp = async (phone, lang) => {
  const user = await User.findOne({ phone, isPhoneVerified: true });

  // Silent success — don't reveal whether phone exists
  if (!user || user.provider !== 'local') return;

  await sendOtp(user, 'reset_password', phone ,lang);
};

// Reset password using the email token
const resetPasswordWithToken = async (rawToken, newPassword , lang) => {

  checkCooldown(user.passwordChangeAllowedAt, 'password change');

  const user = await User.findOne({
    passwordResetToken: hashValue(rawToken),
    passwordResetExpires: { $gt: Date.now() },
  }).select(PRIVATE_FIELDS);

  if (!user) {
    throw new AppError(t(lang, 'RESET_TOKEN_INVALID'), 400, 'INVALID_TOKEN');
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.setPasswordCooldown(); // prevent another password change for 24h
  await user.save();

  // Notify user of the change
  emailService.sendSecurityAlertEmail(user, 'Password changed', lang).catch(() => {});
};

// Reset password using the WhatsApp OTP
const resetPasswordWithOtp = async (phone, submittedOtp, newPassword, lang) => {

  checkCooldown(user.passwordChangeAllowedAt, 'password change', lang);
  const user = await User.findOne({ phone }).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'NO_ACCOUNT_PHONE'), 400, 'USER_NOT_FOUND');

  await verifyOtp(user, submittedOtp, 'reset_password');

  user.password = newPassword;
  user.setPasswordCooldown(); 
  await user.save();

  emailService.sendSecurityAlertEmail(user, 'Password changed via WhatsApp', lang).catch(() => {});
};

// Change password while logged in
const changePassword = async (userId, currentPassword, newPassword, lang) => {
  const user = await User.findById(userId).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'USER_NOT_FOUND'), 404, 'NOT_FOUND');

  // Only the password change action is restricted — nothing else
  checkCooldown(user.passwordChangeAllowedAt, 'password change', lang);

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError(t(lang, 'WRONG_PASSWORD'), 400, 'WRONG_PASSWORD');
  }

  user.password = newPassword;
  user.setPasswordCooldown(); // prevent another password change for 24h
  await user.save();

  emailService.sendSecurityAlertEmail(user, 'Password changed', lang).catch(() => {});
};

// Send a verification OTP to a phone number
const sendPhoneOtp = async (userId, phone, lang) => {
  const user = await User.findById(userId).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  // Make sure no other account uses this phone
  const taken = await User.findOne({ phone, _id: { $ne: userId } });
  if (taken) throw new AppError(t(lang, 'PHONE_TAKEN'), 409, 'PHONE_TAKEN');

  await sendOtp(user, 'verify_phone', phone , lang);
};

// Verify phone OTP and mark phone as verified
const verifyPhone = async (userId, phone, submittedOtp, lang) => {
  const user = await User.findById(userId).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  await verifyOtp(user, submittedOtp, 'verify_phone', lang);

  user.phone = phone;
  user.isPhoneVerified = true;
  await user.save({ validateBeforeSave: false });

  return user.toSafeObject();
};

// Request an email change — sends confirmation to the new email
const requestEmailChange = async (userId, newEmail, password, lang) => {

  const user = await User.findById(userId).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  if(!(await user.comparePassword(password))) {
    throw new AppError(t(lang, 'WRONG_PASSWORD'), 400, 'WRONG_PASSWORD');
  }

  checkCooldown(user.emailChangeAllowedAt, 'email change', lang);

  const taken = await User.findOne({ email: newEmail.toLowerCase() });
  if (taken) throw new AppError(t(lang, 'EMAIL_TAKEN') , 409, 'EMAIL_TAKEN');

  const rawToken = randomToken();
  user.emailChangeToken = hashValue(rawToken);
  user.emailChangeExpires = hoursFromNow(1);
  user.newEmail = newEmail.toLowerCase();
  await user.save({ validateBeforeSave: false });

  const url = buildUrl('confirm-email-change', rawToken);
  await emailService.sendEmailChangeEmail(newEmail, user, url);
};

// Confirm email change from the link clicked in the new inbox
const confirmEmailChange = async (rawToken,lang) => {
  const user = await User.findOne({
    emailChangeToken: hashValue(rawToken),
    emailChangeExpires: { $gt: Date.now() },
  }).select(PRIVATE_FIELDS);

  if (!user) throw new AppError(t('EMAIL_CHANGE_INVALID'), 400, 'INVALID_TOKEN');

  const oldEmail = user.email;
  user.email = user.newEmail;
  user.newEmail = undefined;
  user.emailChangeToken = undefined;
  user.emailChangeExpires = undefined;
  user.isEmailVerified = true;
  user.setEmailCooldown(); // prevent another email change for 24h
  await user.save({ validateBeforeSave: false });

  // Alert old email address of the change
  emailService.sendSecurityAlertEmail({ ...user.toObject(), email: oldEmail }, 'Email address changed', lang).catch(() => {});
};

// Send OTP to a new phone number to confirm the change
const requestPhoneChange = async (userId, newPhone, password, lang) => {
  const user = await User.findById(userId).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  if(!(await user.comparePassword(password))) {
    throw new AppError(t(lang, 'WRONG_PASSWORD'), 400, 'WRONG_PASSWORD');
  }

  // Only phone changes are restricted — nothing else is affected
  checkCooldown(user.phoneChangeAllowedAt, 'phone change', lang);

  const taken = await User.findOne({ phone: newPhone, _id: { $ne: userId } });
  if (taken) throw new AppError(t(lang, 'PHONE_TAKEN'), 409, 'PHONE_TAKEN');

  user.newPhone = newPhone;
  await user.save({ validateBeforeSave: false });

  await sendOtp(user, 'change_phone', newPhone , lang);
};

// Confirm phone change by verifying the OTP sent to the new number
const confirmPhoneChange = async (userId, submittedOtp, lang) => {
  const user = await User.findById(userId).select(PRIVATE_FIELDS);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  await verifyOtp(user, submittedOtp, 'change_phone',lang);

  user.phone = user.newPhone;
  user.newPhone = undefined;
  user.isPhoneVerified = true;
  user.setPhoneCooldown(); // prevent another phone change for 24h
  await user.save({ validateBeforeSave: false });

  emailService.sendSecurityAlertEmail(user, 'Phone number changed', lang).catch(() => {});
};

// Get logged-in user's profile
const getProfile = async (userId, lang) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({
      following: user._id,
      status: 'accepted',
    }),

    Follow.countDocuments({
      follower: user._id,
      status: 'accepted',
    }),
  ]);

  return { ...user.toSafeObject(), followersCount, followingCount };
};

const updateName = async (userId, newName, lang) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  user.name = newName;
  await user.save();
  
  return user.toSafeObject();
}

const deleteAccount = async (userId, password, lang) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError(t(lang, 'NOT_FOUND'), 404, 'NOT_FOUND');

  if (!(await user.comparePassword(password))) {
    throw new AppError(t(lang, 'WRONG_PASSWORD'), 400, 'WRONG_PASSWORD');
  }
  
  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  // emailService.sendSecurityAlertEmail(user, 'Account deactivated', lang).catch(() => {});
  emailService.sendDeleteAccountEmail(user, lang).catch(() => {});

};

const checkUsername = async (username) => {
  const taken = await User.exists({ username: username });
  return !taken;
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  googleLogin,
  forgotPassword,
  forgotPasswordOtp,
  resetPasswordWithToken,
  resetPasswordWithOtp,
  changePassword,
  sendPhoneOtp,
  verifyPhone,
  requestEmailChange,
  confirmEmailChange,
  requestPhoneChange,
  confirmPhoneChange,
  getProfile,
  deleteAccount,
  checkUsername
};
