require('dotenv').config();

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseFirebaseHealthcheckMode = (value) => {
  return String(value || 'passive').toLowerCase() === 'probe' ? 'probe' : 'passive';
};

const activeDbMode = process.env.DB_MODE === 'online' ? 'online' : 'offline';

const offlineDb = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseNumber(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trike_booking_db',
  connectionLimit: parseNumber(process.env.DB_CONNECTION_LIMIT, 10),
  ssl: false,
};

const onlineDb = {
  host: process.env.ONLINE_DB_HOST || '',
  port: parseNumber(process.env.ONLINE_DB_PORT, 3306),
  user: process.env.ONLINE_DB_USER || '',
  password: process.env.ONLINE_DB_PASSWORD || '',
  database: process.env.ONLINE_DB_NAME || '',
  connectionLimit: parseNumber(process.env.ONLINE_DB_CONNECTION_LIMIT, 10),
  ssl: parseBoolean(process.env.ONLINE_DB_SSL, true),
};

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  appName: process.env.APP_NAME || 'Book A Trike API',
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  dbMode: activeDbMode,
  db: {
    offline: offlineDb,
    online: onlineDb,
    active: activeDbMode === 'online' ? onlineDb : offlineDb,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    databaseUrl: process.env.FIREBASE_DATABASE_URL || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    healthcheckMode: parseFirebaseHealthcheckMode(process.env.FIREBASE_HEALTHCHECK_MODE),
  },
  twilio: {
    enabled: parseBoolean(process.env.TWILIO_ENABLED, false),
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
  },
  stream: {
    enabled: parseBoolean(process.env.STREAM_ENABLED, false),
    apiKey: process.env.STREAM_API_KEY || '',
    apiSecret: process.env.STREAM_API_SECRET || '',
    appId: process.env.STREAM_APP_ID || '',
    chatType: process.env.STREAM_CHAT_TYPE || 'messaging',
    webhookSecret: process.env.STREAM_WEBHOOK_SECRET || '',
  },
  security: {
    bcryptRounds: parseNumber(process.env.BCRYPT_ROUNDS, 12),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  },
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN || '',
  },
  notifications: {
    smsProvider: process.env.SMS_PROVIDER || 'twilio',
  },
};

if (config.jwtSecret.length < 32) {
  console.warn('JWT_SECRET should be at least 32 characters long before running this API in production.');
}

if (config.dbMode === 'online' && !config.db.active.host) {
  console.warn('DB_MODE is online but ONLINE_DB_HOST is empty. Falling back config will not work until remote database values are set.');
}

module.exports = {
  config,
};