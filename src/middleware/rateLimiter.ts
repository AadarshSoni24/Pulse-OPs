import rateLimit from 'express-rate-limit';
import { env } from '../config/environment';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.'
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login/register attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Auth Requests',
    message: 'Too many authentication attempts. Please wait 15 minutes.'
  }
});
