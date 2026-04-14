const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const { config } = require('./env');

const activeDatabaseConfig = config.db.active;

// Resolve the Aiven CA certificate.
// Priority: ONLINE_DB_CA_CERT env var (Render) → local ca.pem file → rejectUnauthorized:false fallback
const CA_CERT_PATH = path.resolve(__dirname, '../../database/ca.pem');
const buildSslOptions = () => {
  if (!activeDatabaseConfig.ssl) return undefined;
  const inlineCert = process.env.ONLINE_DB_CA_CERT;
  if (inlineCert) {
    return { ca: inlineCert.replace(/\\n/g, '\n') };
  }
  if (fs.existsSync(CA_CERT_PATH)) {
    return { ca: fs.readFileSync(CA_CERT_PATH) };
  }
  // Fallback when CA cert not present (e.g. CI / local dev with ssl=false)
  return { rejectUnauthorized: false };
};

const pool = mysql.createPool({
  host: activeDatabaseConfig.host,
  port: activeDatabaseConfig.port,
  user: activeDatabaseConfig.user,
  password: activeDatabaseConfig.password,
  database: activeDatabaseConfig.database,
  connectionLimit: activeDatabaseConfig.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  namedPlaceholders: false,
  ssl: buildSslOptions(),
  // Keep connections alive so the cloud DB doesn't drop idle pool connections
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  // Allow extra time for cold-start connections on free-tier cloud DBs
  connectTimeout: 30000,
});

const queryWith = async (executor, sql, params = []) => {
  const [rows] = await executor.execute(sql, params);
  return rows;
};

const query = async (sql, params = []) => queryWith(pool, sql, params);

const checkDatabaseConnection = async () => {
  const startedAt = Date.now();

  try {
    await query('SELECT 1 AS ok');
    return {
      ok: true,
      mode: config.dbMode,
      host: activeDatabaseConfig.host,
      port: activeDatabaseConfig.port,
      database: activeDatabaseConfig.database,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      mode: config.dbMode,
      host: activeDatabaseConfig.host,
      port: activeDatabaseConfig.port,
      database: activeDatabaseConfig.database,
      error: error.message,
      latencyMs: Date.now() - startedAt,
    };
  }
};

const withTransaction = async (handler) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const closePool = async () => {
  await pool.end();
};

module.exports = {
  pool,
  query,
  queryWith,
  checkDatabaseConnection,
  withTransaction,
  closePool,
};