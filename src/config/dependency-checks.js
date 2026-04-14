const { config } = require('./env');
const { checkDatabaseConnection } = require('./database');
const { getFirebaseAdminStatus } = require('./firebase-admin');
const { getStreamStatus } = require('../modules/chat/chat.service');

const getTwilioStatus = async () => {
  if (!config.twilio.enabled) {
    return {
      ok: true,
      enabled: false,
      status: 'disabled',
    };
  }

  const configured = Boolean(config.twilio.accountSid && config.twilio.authToken);

  return {
    ok: configured,
    enabled: true,
    status: configured ? 'configured' : 'missing_credentials',
    phoneNumber: config.twilio.phoneNumber || null,
  };
};

const getDependencyStatus = async () => {
  const [database, firebase, stream, twilio] = await Promise.all([
    checkDatabaseConnection(),
    getFirebaseAdminStatus(),
    getStreamStatus(),
    getTwilioStatus(),
  ]);

  return {
    database,
    firebase,
    stream,
    twilio,
    checkedAt: new Date().toISOString(),
  };
};

const logDependencyStatus = async () => {
  const report = await getDependencyStatus();

  console.log('Dependency checks:');
  console.log(
    `  Database: ${report.database.ok ? 'connected' : 'failed'} (${report.database.host}:${report.database.port}/${report.database.database})${report.database.error ? ` - ${report.database.error}` : ''}`,
  );
  console.log(
    `  Firebase Admin: ${report.firebase.status || (report.firebase.ok ? 'connected' : 'failed')} (${report.firebase.databaseUrl || 'no database url'})${report.firebase.error ? ` - ${report.firebase.error}` : ''}`,
  );
  console.log(
    `  Stream Chat: ${report.stream.ok ? 'connected' : 'failed'} (${report.stream.enabled ? 'enabled' : 'disabled'})${report.stream.error ? ` - ${report.stream.error}` : ''}`,
  );
  console.log(
    `  Twilio: ${report.twilio.ok ? report.twilio.status : 'failed'} (${report.twilio.enabled ? 'enabled' : 'disabled'})`,
  );

  return report;
};

module.exports = {
  getDependencyStatus,
  logDependencyStatus,
};