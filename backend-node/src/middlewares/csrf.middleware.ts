import { NextFunction, Request, Response } from 'express';
import { CookieNames } from '../constants/cookies';
import { ForbiddenError } from '../utils/apiError';
import { csrfTokensMatch } from '../utils/csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const EXEMPT_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/refresh',
  '/api/v1/auth/csrf',
]);

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path) || EXEMPT_PATHS.has(req.originalUrl.split('?')[0])) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CookieNames.CSRF_TOKEN] as string | undefined;
  const headerToken = (req.headers['x-csrf-token'] as string | undefined) ?? undefined;

  if (!csrfTokensMatch(cookieToken, headerToken)) {
    next(new ForbiddenError('Invalid or missing CSRF token'));
    return;
  }

  next();
}
