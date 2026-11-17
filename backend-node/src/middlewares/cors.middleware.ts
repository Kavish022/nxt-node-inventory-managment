import cors from 'cors';
import { env } from '../config/env';

const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // 1. Non-browser requests (mobile apps, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    // 2. If CORS_ORIGIN is '*' or empty, reflect the origin so withCredentials works
    if (allowedOrigins.includes('*') || allowedOrigins.length === 0) {
      callback(null, true);
      return;
    }

    // 3. Exact origin match
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // 4. Any Vercel deployment (preview branches, production: *.vercel.app)
    try {
      const hostname = new URL(origin).hostname;
      if (hostname.endsWith('.vercel.app') || hostname === 'localhost' || hostname === '127.0.0.1') {
        callback(null, true);
        return;
      }
    } catch {
      // Ignore invalid URL
    }

    // 5. Localhost development
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }

    // 6. Safe deny without crashing the process
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-requested-with', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
});
