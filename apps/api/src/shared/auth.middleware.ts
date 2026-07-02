import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors.js';

/**
 * v1 auth: JWT Bearer for the web app, or a static API key for external clients
 * (e.g. the WhatsApp agent). Both are accepted on /api/v1/* routes.
 *
 * Internal cron endpoints use a separate `requireCronSecret` middleware.
 */

interface Principal {
  kind: 'user' | 'api-key';
  subject: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

// Read lazily so dotenv (loaded by the entry point) is guaranteed to have run,
// and so tests can vary the env per test case.
function apiKeys(): string[] {
  return (process.env.HOMESTOCK_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.header('authorization') ?? '';
  const apiKey = req.header('x-api-key');

  if (apiKey && apiKeys().includes(apiKey)) {
    req.principal = { kind: 'api-key', subject: hashHint(apiKey) };
    return next();
  }

  if (auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length);
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not set');
      const payload = jwt.verify(token, secret) as { sub?: string };
      if (!payload.sub) throw new Error('Token missing sub');
      req.principal = { kind: 'user', subject: payload.sub };
      return next();
    } catch {
      return next(new UnauthorizedError('Invalid token'));
    }
  }

  // Local-dev escape hatch. Never honored in production — forgetting to
  // remove AUTH_DISABLED must not silently expose the household data.
  if (process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production') {
    req.principal = { kind: 'user', subject: 'local-dev' };
    return next();
  }

  return next(new UnauthorizedError());
}

export function requireCronSecret(req: Request, _res: Response, next: NextFunction): void {
  const expected = process.env.CRON_SECRET;
  const got = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? req.header('x-cron-secret');
  if (!expected || got !== expected) {
    return next(new UnauthorizedError('Invalid cron secret'));
  }
  next();
}

function hashHint(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-2)}`;
}
