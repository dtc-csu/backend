require('dotenv').config();

const app = require('./src/app');
const { logDependencyStatus } = require('./src/config/dependency-checks');
const { config } = require('./src/config/env');
const { closePool } = require('./src/config/database');

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
