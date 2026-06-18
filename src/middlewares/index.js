const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const { verifyToken } = require('../utils/helpers');
const { t, detectLang } = require('../utils/i18n');



const detectLanguage = (req , res, next) => {
  req.lang = detectLang(req);
  next();
};

// ── 1. Validation Middleware ───────────────────────────────
// Run this AFTER express-validator chains to collect and return errors

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Format errors as field → message pairs
  const formatted = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return res.status(400).json({
    status: 'fail',
    message: t(req.lang, 'VALIDATION_FAILED'),
    code: 'VALIDATION_ERROR',
    errors: formatted,
  });
};

// ── 2. Auth Middleware (protect) ──────────────────────────
// Checks that the request has a valid JWT token.

const protect = async (req, res, next) => {
  try {
    let token = null;

    // Source 1: Authorization header (e.g. from a React SPA or mobile app)
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    }

    // Source 2: HTTP-only cookie (set after Google OAuth redirect)
    // Only falls back to cookie if no Bearer token was found
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError(t(req.lang, 'NO_TOKEN'), 401, 'NO_TOKEN'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new AppError(t(req.lang, 'INVALID_TOKEN'), 401, 'INVALID_TOKEN'));
    }

    // Check user still exists in DB
    const user = await User.findById(decoded.sub).select('+isActive +passwordChangedAt');
    if (!user || !user.isActive) {
      return next(new AppError(t(req.lang, 'USER_NOT_FOUND'), 401, 'USER_NOT_FOUND'));
    }

    // If password changed after this token was issued, force re-login
    if (user.passwordChangedAfter(decoded.iat)) {
      return next(new AppError(t(req.lang, 'PASSWORD_CHANGED_RELOGIN'), 401, 'PASSWORD_CHANGED'));
    }

    // Attach user to request so controllers can use it
    req.user = user;
    req.tokenIssuedAt = decoded.iat;
    next();
  } catch (err) {
    next(err);
  }
};

// ── 3. Role Restriction ───────────────────────────────────
// Only allow users with specific roles to proceed

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(t(req.lang, 'INSUFFICIENT_ROLE', { roles: roles.join(', ') }), 403, 'INSUFFICIENT_ROLE')
      );
    }
    next();
  };
};

// ── 5. Rate Limiters ──────────────────────────────────────
// Pure in-memory rate limiting using express-rate-limit.
// State is stored in the Node.js process — simple and zero-dependency.
// Note: if you run multiple server instances, each has its own counter.

// Shared error response format for all limiters
const rateLimitHandler = (req, res, next, options) => {
  // We calculate remaining minutes from the window for a friendly message
  const resetTime = res.getHeader('RateLimit-Reset');
  const secondsLeft = resetTime
    ? Math.max(0, resetTime - Math.floor(Date.now() / 1000))
    : Math.ceil(options.windowMs / 1000);

  const minutesLeft = Math.ceil(secondsLeft / 60);
  const timeStr = minutesLeft >= 1
    ? `${minutesLeft} ${req.lang === 'ar' ? 'دقيقة' : 'minute(s)'}`
    : `${secondsLeft} ${req.lang === 'ar' ? 'ثانية' : 'second(s)'}`;

  res.status(429).json({
    status: 'fail',
    message: t(req.lang, 'TOO_MANY_REQUESTS', { time: timeStr }),
    code: 'TOO_MANY_REQUESTS',
    retryAfterSeconds: secondsLeft,
  });
};

// Helper to build a limiter — keeps the config below clean and readable
const makeLimiter = ({ windowMs, max, keyFn }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // sends RateLimit-* headers
    legacyHeaders: false,
    keyGenerator: keyFn || ((req) => req.ip),
    handler: rateLimitHandler,
    // Skip OPTIONS preflight requests
    skip: (req) => req.method === 'OPTIONS',
  });

const makeDualLimiter = ({ windowMs, idMax, ipMax }) => [
  makeLimiter({
    windowMs,
    max: idMax,
    keyFn: (req) => req.user.id,
  }),
  makeLimiter({
    windowMs,
    max: ipMax,
    keyFn: (req) => req.ip,
  }),
];

const rateLimiters = {
  // General API — 100 req / 15 min per IP
  global: makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),

  // Login / register — 10 req / 15 min, keyed by IP + email
  // Combining IP + email prevents one IP hammering many accounts
  auth: makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: (req) => `${req.ip}:${req.body?.email || ''}`,
  }),

  // OTP send/verify — 5 req / 10 min, keyed by IP + phone/email
  otp: makeLimiter({
    windowMs: 10 * 60 * 1000,
    max: 4,
    keyFn: (req) => `${req.ip}:${req.body?.phone || req.body?.email || ''}`,
  }),

  // Password reset — 5 req / hour (strict to prevent abuse)
  reset: makeLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyFn: (req) => `${req.ip}:${req.body?.email || req.body?.phone || ''}`,
  }),

  // Resend verification email — 3 req / hour
  resend: makeLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyFn: (req) => `${req.ip}:${req.body?.email || ''}`,
  }),

  // Name change — 10 req / 24h per user (enforced by user ID, not IP, since user must be logged in)
  nameChange: makeDualLimiter({
    windowMs:  60 * 60 * 1000,
    idMax: 10,
    ipMax: 20, // Also limit by IP to prevent one user from hammering many accounts
  }),

  emailChange: makeDualLimiter({
    windowMs: 15 * 60 * 1000,
    idMax: 10,
    ipMax: 20,
  }),

  phoneChange: makeDualLimiter({
    windowMs: 15 * 60 * 1000,
    idMax: 10,
    ipMax: 20,
  }),

  changePassword: makeDualLimiter({
    windowMs: 30 * 60 * 1000,
    idMax: 10,
    ipMax: 20,
  }),
};

// ── 6. Global Error Handler ───────────────────────────────

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Log server errors
  if (statusCode >= 500) {
    console.error(`[${req.method}] ${req.originalUrl}`, err);
  }

  // In production, hide details of unknown errors (bugs, etc.)
  if (isProd && !err.isOperational) {
    return res.status(500).json({
      status: 'error',
      message: t(req.lang, 'INTERNAL_ERROR') || 'An unexpected error occurred.',
      code: 'INTERNAL_ERROR',
    });
  }

  // Handle Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyValue || {});
    if (keys.includes('title') && keys.includes('companyId') && keys.includes('startDate')) {
      return res.status(409).json({status: 'fail', message: "هذا الإيفنت موجود مسبقاً." , code: 'DUPLICATE_EVENT'});
  }
  if (keys.includes('userId') && keys.includes('arrivalTime')) {
    return res.status(409).json({ 
      status: 'fail', 
      message: "عذراً، لديك بالفعل موعد محجوز في هذا التوقيت." ,
      code: 'DUPLICATE_APPOINTMENT'
    });
  }

    const field = keys[0] || 'field';
    return res.status(409).json({
      status: 'fail',
      message: t(req.lang, 'DUPLICATE_FIELD', { field }),
      code: 'DUPLICATE_FIELD',
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      status: 'fail',
      message: t(req.lang, 'VALIDATION_FAILED'),
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  // Handle invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: t(req.lang, 'NOT_FOUND'),
      code: 'INVALID_ID',
    });
  }

  // Return the error as-is (operational errors have a code and message)
  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: err.message,
    code: err.code,
    // Only show stack trace in development
    ...(isProd ? {} : { stack: err.stack }),
  });
};

module.exports = {
  validate,
  protect,
  restrictTo,
  rateLimiters,
  errorHandler,
  detectLanguage,
};
