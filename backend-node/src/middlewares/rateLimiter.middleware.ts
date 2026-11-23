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
  // Payments have authenticated per-user limits to support status polling behind shared IPs.
  skip: (req) => /^\/api\/(?:v1\/)?payments(?:\/|$)/.test(req.originalUrl.split('?')[0]),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many requests from this IP, please try again later.'),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitMessage('Too many authentication attempts. Please try again later.'),
});
