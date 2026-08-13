import winston from 'winston';
import { env } from '../config/environment';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'test' ? 'error' : env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'pulseops-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] [${level}] [${service}]: ${message} ${metaString}`;
        })
      )
    })
  ]
});
