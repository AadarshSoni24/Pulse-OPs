import { SchedulerWorker } from './schedulerWorker';
import { logger } from '../utils/logger';

logger.info('Starting Scheduler Worker Process...');
SchedulerWorker.start(10000);
