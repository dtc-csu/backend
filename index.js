require('dotenv').config();

const app = require('./src/app');
const { logDependencyStatus } = require('./src/config/dependency-checks');
const { config } = require('./src/config/env');
const { closePool } = require('./src/config/database');

// Print a small, safe debug summary of DB envs (masking secrets). This helps
// confirm the values the running process actually sees (reveals stray
// whitespace or missing vars) without printing passwords.
const dbHost = String(config.db.active.host || '');
const dbPort = config.db.active.port || '';
const dbSsl = Boolean(config.db.active.ssl || process.env.ONLINE_DB_SSL);
console.log(`Effective DB config: host >>>${dbHost}<<< (len=${dbHost.length}) port:${dbPort} ssl:${dbSsl} DB_MODE:${config.dbMode} ONLINE_DB_CA_CERT_set:${Boolean(process.env.ONLINE_DB_CA_CERT)}`);

const server = app.listen(config.port, () => {
	console.log(`Book A Trike API listening on port ${config.port}`);
	void logDependencyStatus();
});

const shutdown = async (signal) => {
	console.log(`Received ${signal}, shutting down gracefully`);

	server.close(async () => {
		await closePool();
		process.exit(0);
	});
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
	process.on(signal, () => {
		void shutdown(signal);
	});
});

process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught exception', error);
	process.exit(1);
});
