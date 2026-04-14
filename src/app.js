const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { config } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { sanitizeRequest } = require('./middlewares/validate.middleware');
const routes = require('./modules');

const app = express();

const isLocalDevelopmentOrigin = (origin) => {
  if (!origin || config.nodeEnv === 'production') {
    return false;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests, please try again later.',
  },
});

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        config.corsOrigins.length === 0 ||
        config.corsOrigins.includes(origin) ||
        isLocalDevelopmentOrigin(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(sanitizeRequest);
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(apiLimiter);

app.use(config.apiPrefix, routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;