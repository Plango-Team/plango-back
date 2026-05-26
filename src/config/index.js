// We read from process.env (loaded by dotenv in server.js).

const { Redirect } = require("twilio/lib/twiml/VoiceResponse");

const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  isProd: process.env.NODE_ENV === 'production',

  // MongoDB
  mongoUri: process.env.MONGODB_URI,

  // JWT — single access token only (no refresh token)
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },

  // Email
  email: {
    // host: process.env.EMAIL_HOST,
    // port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'Auth App <noreply@yourapp.com>',
  },

  // WhatsApp OTP
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_WHATSAPP_FROM,
    },
    meta: {
      token: process.env.META_WHATSAPP_TOKEN,
      phoneNumberId: process.env.META_PHONE_NUMBER_ID,
      languageCode: process.env.META_TEMPLATE_LANGUAGE || 'en_US',
      templates: {
        verify_phone:   process.env.META_TEMPLATE_VERIFY_PHONE   || 'verify_phone_otp',
        reset_password: process.env.META_TEMPLATE_RESET_PASSWORD || 'reset_password_otp',
        change_phone:   process.env.META_TEMPLATE_CHANGE_PHONE   || 'change_phone_otp',
      },
    },
  },
  redis: {
    url: process.env.REDIS_URL,
  },

  // OTP settings
  otpExpiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES) || 10,

  // Security lock duration after password/email/phone change
  securityLockHours: parseInt(process.env.SECURITY_LOCK_HOURS) || 24,
  // Account deletion grace period (time before permanent deletion after user requests account deletion)
  deletionGraceHours: parseInt(process.env.DELETION_GRACE_HOURS) || 24,
};

// Make sure the critical values are set before the app starts
const checkRequired = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = { config, checkRequired };
