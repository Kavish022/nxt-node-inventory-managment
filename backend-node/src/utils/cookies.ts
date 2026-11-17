import { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { CookieNames } from '../constants/cookies';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function baseCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const base = baseCookieOptions();

  res.cookie(CookieNames.ACCESS_TOKEN, accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE_MS,
  });

  res.cookie(CookieNames.REFRESH_TOKEN, refreshToken, {
    ...base,
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CookieNames.CSRF_TOKEN, token, {
    ...baseCookieOptions(),
    maxAge: ACCESS_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  const base = baseCookieOptions();
  res.clearCookie(CookieNames.ACCESS_TOKEN, base);
  res.clearCookie(CookieNames.REFRESH_TOKEN, base);
  res.clearCookie(CookieNames.CSRF_TOKEN, base);
}
