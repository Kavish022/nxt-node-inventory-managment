import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { env } from '../config/env';

morgan.token('request-id', (req: Request) => req.requestId ?? '-');
morgan.token('user-id', (req: Request) => (req.user ? String(req.user.id) : 'anonymous'));

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export const loggerMiddleware = morgan(
  env.NODE_ENV === 'production'
    ? ':remote-addr :method :url :status :res[content-length] - :response-time ms rid=:request-id uid=:user-id'
    : 'dev'
);
