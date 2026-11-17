import { AuthUserPayload } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      requestId?: string;
    }
  }
}

export {};
