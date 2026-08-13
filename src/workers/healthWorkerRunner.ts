import { healthCheckWorker } from './healthWorker';
import { incidentWorker } from './incidentWorker';
import { logger } from '../utils/logger';

logger.info('Health Check Worker & Incident Worker process initialized and listening for jobs');

const gracefulWorkerShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Draining in-flight jobs and shutting down workers...`);
  await healthCheckWorker.close();
  await incidentWorker.close();
  logger.info('Health & Incident workers shut down cleanly.');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulWorkerShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulWorkerShutdown('SIGINT'));
