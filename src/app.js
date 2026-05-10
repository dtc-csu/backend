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

app.get('/payment-success', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Successful</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}.card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.1)}h1{color:#16a34a}p{color:#4b5563}</style></head><body><div class="card"><h1>&#10003; Payment Successful</h1><p>Your payment has been processed.</p><p>You may close this tab and return to the app.</p></div></body></html>`);
});

app.get('/payment-cancel', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Cancelled</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fef2f2}.card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.1)}h1{color:#dc2626}p{color:#4b5563}</style></head><body><div class="card"><h1>&#10007; Payment Cancelled</h1><p>Your payment was not completed.</p><p>You may close this tab and return to the app.</p></div></body></html>`);
});

app.use(config.apiPrefix, routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;