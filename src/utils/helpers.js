// Small helper functions used across the app

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const User = require('../models/user.model');

// ── Hashing ───────────────────────────────────────────────

// Hash any string using SHA-256 (used for tokens and OTPs stored in DB)
const hashValue = (value) => {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
};

// Generate a random secure token (used for email links)
// Returns 64 hex characters (32 bytes)
const randomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate a 6-digit OTP using crypto (NOT Math.random — that's not secure)
const generateOtp = () => {
  const num = crypto.randomBytes(4).readUInt32BE(0);
  return String(100000 + (num % 900000)); // always 6 digits
};

// ── JWT ───────────────────────────────────────────────────

// Sign a JWT for the given user (called on login and Google OAuth)
const signToken = (userId, role) => {
  return jwt.sign(
    { sub: userId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Verify a JWT and return the decoded payload
// Returns null if the token is invalid or expired
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
};

// ── Response Helpers ──────────────────────────────────────

// Send a success response
const sendSuccess = (res, statusCode, message, data = null) => {
  const body = { status: 'success', message };
  if (data) body.data = data;
  return res.status(statusCode).json(body);
};

// Send an error response
const sendError = (res, statusCode, message, code = null, errors = null) => {
  const body = { status: 'fail', message };
  if (code) body.code = code;
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

// ── Async Wrapper ─────────────────────────────────────────

// Wraps async route handlers so we don't need try/catch in every controller
// Any thrown error automatically goes to Express error handler
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── Time Helpers ──────────────────────────────────────────

// Add minutes to now — used for OTP expiry
const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

// Add hours to now — used for token expiry and security lock
const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

const releaseExpiredPhone = async (phone) => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const user = await User.findOne({ phone });

  if(!user) return;
  const isExpired = Date.now() - user.createdAt.getTime() > ONE_DAY;
  if( (isExpired && !user.isPhoneVerified)  || !user.isActive ) {
    await User.updateOne({ _id: user._id }, { $unset: { phone: 1 } }); // OR phone ""
  }
};

module.exports = {
  hashValue,
  randomToken,
  generateOtp,
  signToken,
  verifyToken,
  sendSuccess,
  sendError,
  catchAsync,
  minutesFromNow,
  hoursFromNow,
  releaseExpiredPhone
};
