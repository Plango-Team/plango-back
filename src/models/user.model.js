const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { config } = require('../config');

const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [20, 'Name cannot exceed 20 characters'],
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [4, 'Username must be at least 4 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    
    isPrivate: {
      type: Boolean,
      default: false,
    },

    bio: {
      type: String,
      maxlength: [120, 'Bio cannot exceed 120 characters'],
    },

    // Password is hidden by default (select: false) for security
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    location: {
      type: String,
      maxlength: [15, 'Location cannot exceed 15 characters'],
    },

    // ── Login Provider ────────────────────────────────────
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    googleId: {
      type: String,
    },

    // ── Role ──────────────────────────────────────────────
    role: {
      type: String,
      enum: ['user', 'org', 'admin'],
      default: 'user',
    },

    // ── Phone ─────────────────────────────────────────────
    phone: {
      type: String,
      trim: true,
      // Must be in international format: +12025551234
      match: [/^\+[1-9]\d{6,14}$/, 'Phone must be in international format (e.g. +12025551234)'],
    },

    // ── Verification Status ───────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    // ── Email Verification Token ──────────────────────────
    // Sent via email link when user registers
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // ── Password Reset ────────────────────────────────────
    // Token sent via email link
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // ── OTP (WhatsApp) ────────────────────────────────────
    // Shared fields for all OTP types (phone verify, reset password, phone change)
    otp: { type: String, select: false },             // stored hashed
    otpExpires: { type: Date, select: false },
    otpType: {
      type: String,
      enum: ['verify_phone', 'reset_password', 'change_phone'],
      select: false,
    },

    // ── Email Change ──────────────────────────────────────
    emailChangeToken: { type: String, select: false },
    emailChangeExpires: { type: Date, select: false },
    newEmail: { type: String, select: false },        // pending new email

    // ── Phone Change ──────────────────────────────────────
    newPhone: { type: String, select: false },        // pending new phone

    // ── Action Cooldowns ──────────────────────────────────
    // Set to now + 24h after a successful change.
    passwordChangeAllowedAt: { type: Date, default: null },
    emailChangeAllowedAt:    { type: Date, default: null },
    phoneChangeAllowedAt:    { type: Date, default: null },

    // Used to detect if password changed AFTER a JWT was issued
    passwordChangedAt: { type: Date, select: false },

    // Soft delete — deactivated users can't log in
    isActive: { type: Boolean, default: true, select: false },

    lastLoginAt: { type: Date },

    fcmTokens: [{ type: String, select: false }], // for push notifications
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

userSchema.index({ email: 1 } , { unique: true , partialFilterExpression: { isActive: { $eq: true } } } );
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" }, isActive: { $eq: true } } }); 
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" }, isActive: { $eq: true } } }); // unique phone when set
userSchema.index({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: "string" }, isActive: { $eq: true } } }); // unique username when set

// ── Cooldown helpers ──────────────────────────────────────
// can be performed again. Returns 0 when the cooldown has passed.

const hoursRemaining = (date) => {
  if (!date || date <= Date.now()) return 0;
  return Math.ceil((date - Date.now()) / (1000 * 60 * 60));
};

userSchema.virtual('passwordChangeCooldownHours').get(function () {
  return hoursRemaining(this.passwordChangeAllowedAt);
});

userSchema.virtual('emailChangeCooldownHours').get(function () {
  return hoursRemaining(this.emailChangeAllowedAt);
});

userSchema.virtual('phoneChangeCooldownHours').get(function () {
  return hoursRemaining(this.phoneChangeAllowedAt);
});

// ── Hash password before saving ───────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash if password was actually changed
  if (!this.isModified('password') || !this.password) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // Track when password changed (to invalidate old JWTs)
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000); // 1s back for JWT timing
  }

  next();
});

// ── Check if submitted password matches stored hash ───────
userSchema.methods.comparePassword = function (submitted) {
  return bcrypt.compare(submitted, this.password);
};

// ── Check if password changed AFTER a JWT was issued ──────
// If yes, the JWT is no longer valid
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (!this.passwordChangedAt) return false;
  const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000);
  return jwtIssuedAt < changedAt;
};

// ── Set per-action cooldowns ──────────────────────────────
// Called after a successful change to prevent repeating it for 24h.

const cooldownDate = () => {
  const hours = config.securityLockHours; // reuses the same env var
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

userSchema.methods.setPasswordCooldown = function () {
  this.passwordChangeAllowedAt = cooldownDate();
};

userSchema.methods.setEmailCooldown = function () {
  this.emailChangeAllowedAt = cooldownDate();
};

userSchema.methods.setPhoneCooldown = function () {
  this.phoneChangeAllowedAt = cooldownDate();
};

// ── Clear OTP fields ──────────────────────────────────────
userSchema.methods.clearOtp = function () {
  this.otp = undefined;
  this.otpExpires = undefined;
  this.otpType = undefined;
};

// ── Return safe user object (no sensitive fields) ─────────
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    location: this.location,
    bio: this.bio,
    username: this.username,
    isPrivate: this.isPrivate,
    provider: this.provider,
    phone: this.phone,
    isEmailVerified: this.isEmailVerified,
    isPhoneVerified: this.isPhoneVerified,
    // Shows how many hours remain on each individual cooldown (0 = no cooldown)
    passwordChangeCooldownHours: this.passwordChangeCooldownHours,
    emailChangeCooldownHours: this.emailChangeCooldownHours,
    phoneChangeCooldownHours: this.phoneChangeCooldownHours,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = User;
