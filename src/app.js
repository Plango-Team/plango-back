require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const passport = require('passport');
const cookieParser = require('cookie-parser');

const { config, checkRequired } = require('./config');
const setupPassport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const userRoutes = require('./routes/user.routes');
const followRoutes = require('./routes/follow.routes');
const taskRoutes = require('./routes/task.routes');
const notificationRoutes = require('./routes/notification.routes');
const { errorHandler, rateLimiters , detectLanguage } = require('./middlewares');

// Crash early if required env variables are missing
checkRequired();

const app = express();

// ── Trust proxy (needed when behind nginx/load balancer) ──
// app.set('trust proxy', 1);  uncomment when deploy

// ── Security Headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────────────────
// Limit body size to 10kb to prevent payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Cookie Parser ─────────────────────────────────────────
// Needed so protect middleware can read the HTTP-only cookie
app.use(cookieParser());

// ── Compression ───────────────────────────────────────────
app.use(compression());

// ── HTTP Logging ──────────────────────────────────────────
// 'dev' format in development, minimal 'tiny' in production
app.use(morgan(config.isProd ? 'tiny' : 'dev'));

// ── Security: Input Sanitization ──────────────────────────
app.use(mongoSanitize()); // prevents NoSQL injection: { "$gt": "" }
app.use(xssClean());      // strips HTML tags from input
app.use(hpp());           // prevents ?sort=name&sort=email pollution

app.use(detectLanguage); // detect user language for i18n

// ── Passport (Google OAuth) ───────────────────────────────
setupPassport();
app.use(passport.initialize()); // no sessions — JWT only

// ── Global Rate Limiter ───────────────────────────────────
app.use('/api', rateLimiters.global);

// ── Health Check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv, time: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', followRoutes);
app.use('/api/notifications', notificationRoutes);
// ── 404 Handler ───────────────────────────────────────────
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

module.exports = app;
