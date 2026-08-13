import Redis, { RedisOptions } from 'ioredis';
import { Queue } from 'bullmq';
import { env } from './environment';
import { logger } from '../utils/logger';

const parseRedisUrl = (url: string): RedisOptions => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    };
  } catch {
    return { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null, enableReadyCheck: false };
  }
};

export const redisConnectionOptions: RedisOptions = {
  ...parseRedisUrl(env.REDIS_URL),
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (env.NODE_ENV === 'test' || times > 2) {
      return null; // Stop retrying if Redis is offline
    }
    return Math.min(times * 200, 2000);
  }
};

export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info('Redis client connected to server');
});

redisClient.on('error', (err) => {
  if (env.NODE_ENV !== 'test') {
    logger.error('Redis connection error', { error: err.message });
  }
});

// BullMQ Queues Definition
export const QUEUE_NAMES = {
  HEALTH_CHECK: 'health-check-queue',
  INCIDENT: 'incident-queue',
  NOTIFICATION: 'notification-queue',
  SSL_CHECK: 'ssl-check-queue'
} as const;

export const healthCheckQueue = new Queue(QUEUE_NAMES.HEALTH_CHECK, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const incidentQueue = new Queue(QUEUE_NAMES.INCIDENT, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const sslCheckQueue = new Queue(QUEUE_NAMES.SSL_CHECK, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

// Suppress unhandled queue connection errors during unit testing
[healthCheckQueue, incidentQueue, notificationQueue, sslCheckQueue].forEach((queue) => {
  queue.on('error', () => {});
});
