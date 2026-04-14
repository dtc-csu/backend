const fs = require('fs');
const path = require('path');

const admin = require('firebase-admin');

const { config } = require('./env');

let firebaseApp;

const resolvePathValue = (value) => {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
};

const resolveServiceAccountPath = () => {
  const serviceAccountPath =
    config.firebase.serviceAccountPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  return resolvePathValue(serviceAccountPath);
};

const getHealthcheckMode = () => config.firebase.healthcheckMode || 'passive';

const resolveCredential = () => {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (inlineJson) {
    return {
      source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
      credential: JSON.parse(inlineJson),
    };
  }

  const serviceAccountPath = resolveServiceAccountPath();

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    return {
      source: serviceAccountPath,
      credential: require(serviceAccountPath),
    };
  }

  return null;
};

const hasFirebaseAdminCredential = () => Boolean(resolveCredential());

const ensureFirebaseAdmin = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const resolvedCredential = resolveCredential();

  if (!config.firebase.databaseUrl) {
    const error = new Error('Firebase Realtime Database URL is missing. Set FIREBASE_DATABASE_URL.');
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }

  if (!resolvedCredential) {
    const error = new Error(
      'Firebase Admin credentials were not found. Set FIREBASE_SERVICE_ACCOUNT_PATH, GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT_JSON. google-services.json and GoogleService-Info.plist are client files and will not work for Firebase Admin.',
    );
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }

  firebaseApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(resolvedCredential.credential),
        databaseURL: config.firebase.databaseUrl,
        projectId: config.firebase.projectId || undefined,
        storageBucket: config.firebase.storageBucket || undefined,
      });

  console.log(`FirebaseAdmin: initialized using ${resolvedCredential.source}`);
  return firebaseApp;
};

const getDatabase = () => ensureFirebaseAdmin().database();
const getMessaging = () => ensureFirebaseAdmin().messaging();
const createCustomToken = (user) => {
  if (!user || !user.userId || !user.role) {
    throw new Error('A user with userId and role is required to create a Firebase custom token.');
  }

  return ensureFirebaseAdmin().auth().createCustomToken(String(user.userId), {
    userId: Number(user.userId),
    role: user.role,
  });
};

const getFirebaseAdminStatus = async () => {
  const startedAt = Date.now();
  const healthcheckMode = getHealthcheckMode();

  if (!config.firebase.databaseUrl) {
    return {
      ok: false,
      enabled: false,
      status: 'missing_database_url',
      healthcheckMode,
      projectId: config.firebase.projectId || null,
      databaseUrl: null,
      serviceAccountPath: resolveServiceAccountPath(),
      credentialSource: null,
      error: 'Firebase Realtime Database URL is missing. Set FIREBASE_DATABASE_URL.',
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!hasFirebaseAdminCredential()) {
    return {
      ok: true,
      enabled: false,
      status: 'disabled',
      healthcheckMode,
      projectId: config.firebase.projectId || null,
      databaseUrl: config.firebase.databaseUrl || null,
      serviceAccountPath: resolveServiceAccountPath(),
      credentialSource: null,
      note: 'Firebase Admin is optional. Client SDK files like google-services.json and GoogleService-Info.plist are enough for the app, but backend Firebase Admin features remain disabled until a service account is provided.',
      latencyMs: Date.now() - startedAt,
    };
  }

  try {
    const resolvedCredential = resolveCredential();
    ensureFirebaseAdmin();

    if (healthcheckMode !== 'probe') {
      return {
        ok: true,
        enabled: true,
        status: 'configured',
        healthcheckMode,
        projectId: config.firebase.projectId || null,
        databaseUrl: config.firebase.databaseUrl || null,
        serviceAccountPath: resolveServiceAccountPath(),
        credentialSource: resolvedCredential?.source || null,
        note: 'Firebase Admin initialized. Live Realtime Database probing is disabled by default; set FIREBASE_HEALTHCHECK_MODE=probe to verify outbound network access.',
        latencyMs: Date.now() - startedAt,
      };
    }

    await getDatabase().ref('__healthcheck__').get();

    return {
      ok: true,
      enabled: true,
      status: 'connected',
      healthcheckMode,
      projectId: config.firebase.projectId || null,
      databaseUrl: config.firebase.databaseUrl || null,
      serviceAccountPath: resolveServiceAccountPath(),
      credentialSource: resolvedCredential?.source || null,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      enabled: true,
      status: 'failed',
      healthcheckMode,
      projectId: config.firebase.projectId || null,
      databaseUrl: config.firebase.databaseUrl || null,
      serviceAccountPath: resolveServiceAccountPath(),
      credentialSource: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        ? 'FIREBASE_SERVICE_ACCOUNT_JSON'
        : resolveServiceAccountPath(),
      error: error.message,
      latencyMs: Date.now() - startedAt,
    };
  }
};

module.exports = {
  ensureFirebaseAdmin,
  getDatabase,
  getMessaging,
  createCustomToken,
  getFirebaseAdminStatus,
  hasFirebaseAdminCredential,
};