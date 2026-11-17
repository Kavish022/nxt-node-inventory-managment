import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { HttpStatus } from '../constants/httpStatusCodes';

function limitMessage(message: string) {
  return {
    success: false,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message,
    timestamp: new Date().toISOString(),
  };
}

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many requests from this IP, please try again later.'),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many authentication attempts. Please try again later.'),
});
