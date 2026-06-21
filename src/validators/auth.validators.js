const { body, query } = require('express-validator');

// Reusable field validators
const nameField = body('name')
  .trim()
  .notEmpty().withMessage('Name is required')
  .isLength({ min: 3, max: 80 }).withMessage('Name must be 3–80 characters');

const bioField = body('bio')
  .optional()
  .trim()
  .isLength({ max: 120 }).withMessage('Bio cannot exceed 120 characters');


const usernameField = (field = 'username') =>
  query(field)
  .trim()
  .notEmpty().withMessage('Username is required')
  .isLength({ min: 4, max: 30 }).withMessage('Username must be 4–30 characters')
  .matches(/^[a-zA-Z0-9]+$/).withMessage('Username can only contain letters and numbers');

const emailField = (field = 'email') =>
  body(field)
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail();

// Password rules — enforced consistently everywhere
const passwordField = (field = 'password') =>
  body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password needs at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password needs at least one lowercase letter')
    .matches(/\d/).withMessage('Password needs at least one number')
    .matches(/[@$!%*?&^#]/).withMessage('Password needs at least one special character');

// Phone must be in E.164 international format: +12025551234
const phoneField = (field = 'phone') =>
  body(field)
    .trim()
    .matches(/^\+[1-9]\d{6,14}$/).withMessage('Phone must be in international format e.g. +12025551234');

// OTP is always exactly 6 digits
const otpField = body('otp')
  .trim()
  .notEmpty().withMessage('OTP is required')
  .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  .isNumeric().withMessage('OTP must be numbers only');

// Token is a 64-char hex string (32 random bytes)
const tokenBodyField = body('token')
  .trim()
  .notEmpty().withMessage('Token is required')
  .isHexadecimal().withMessage('Invalid token format')
  .isLength({ min: 64, max: 64 }).withMessage('Invalid token length');

const tokenQueryField = query('token')
  .trim()
  .notEmpty().withMessage('Token is required')
  .isHexadecimal().withMessage('Invalid token format')
  .isLength({ min: 64, max: 64 }).withMessage('Invalid token length');

// Confirm password must match new password
const confirmPasswordField = (matchField = 'newPassword') =>
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body[matchField]) throw new Error('Passwords do not match');
    return true;
  });

// ── Exported validator arrays ─────────────────────────────
// Each array is passed to the route before the controller

module.exports = {
  validateRegister: [
    nameField,
    bioField,
    emailField(),
    passwordField(),
    phoneField('phone').optional({ checkFalsy: true }),
    body('role').optional().isIn(['user', 'org', 'admin']).withMessage('Invalid role'),
  ],

  validateLogin: [
    emailField(),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  validateForgotPassword: [emailField()],
  validateForgotPasswordOtp: [phoneField()],

  validateResetPasswordToken: [
    tokenBodyField,
    passwordField('newPassword'),
    confirmPasswordField(),
  ],

  validateResetPasswordOtp: [
    phoneField(),
    otpField,
    passwordField('newPassword'),
    confirmPasswordField(),
  ],

  validateChangePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    passwordField('newPassword'),
    confirmPasswordField(),
  ],

  validateSendPhoneOtp: [phoneField()],

  validateVerifyPhone: [phoneField(), otpField],

  validateRequestEmailChange: [emailField('newEmail')],

  validateConfirmEmailChange: [tokenQueryField],

  validateRequestPhoneChange: [phoneField('newPhone')],

  validateConfirmPhoneChange: [otpField],

  validateResendVerification: [emailField()],

  validateUpdateName: [nameField],

  validateCheckUsername: [usernameField()]
};
