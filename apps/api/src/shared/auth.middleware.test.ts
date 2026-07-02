import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireCronSecret } from './auth.middleware.js';
import { UnauthorizedError } from './errors.js';

const ENV_KEYS = ['HOMESTOCK_API_KEYS', 'JWT_SECRET', 'AUTH_DISABLED', 'NODE_ENV', 'CRON_SECRET'];
const saved: Record<string, string | undefined> = {};

function makeReq(headers: Record<string, string> = {}): Request {
  return {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

const res = {} as Response;

describe('requireAuth', () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('accepts a configured API key', () => {
    process.env.HOMESTOCK_API_KEYS = 'key-one, key-two';
    const next = vi.fn();
    const req = makeReq({ 'x-api-key': 'key-two' });

    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.principal?.kind).toBe('api-key');
  });

  it('rejects an unknown API key (falls through to 401)', () => {
    process.env.HOMESTOCK_API_KEYS = 'key-one';
    const next = vi.fn();

    requireAuth(makeReq({ 'x-api-key': 'wrong' }), res, next);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });

  it('accepts a valid Bearer JWT', () => {
    process.env.JWT_SECRET = 'test-secret';
    const token = jwt.sign({ sub: 'user-1' }, 'test-secret');
    const next = vi.fn();
    const req = makeReq({ authorization: `Bearer ${token}` });

    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.principal).toEqual({ kind: 'user', subject: 'user-1' });
  });

  it('rejects a JWT signed with the wrong secret', () => {
    process.env.JWT_SECRET = 'test-secret';
    const token = jwt.sign({ sub: 'user-1' }, 'other-secret');
    const next = vi.fn();

    requireAuth(makeReq({ authorization: `Bearer ${token}` }), res, next);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });

  it('allows unauthenticated requests with AUTH_DISABLED outside production', () => {
    process.env.AUTH_DISABLED = 'true';
    process.env.NODE_ENV = 'development';
    const next = vi.fn();

    requireAuth(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('ignores AUTH_DISABLED in production', () => {
    process.env.AUTH_DISABLED = 'true';
    process.env.NODE_ENV = 'production';
    const next = vi.fn();

    requireAuth(makeReq(), res, next);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects requests with no credentials at all', () => {
    const next = vi.fn();
    requireAuth(makeReq(), res, next);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });
});

describe('requireCronSecret', () => {
  beforeEach(() => {
    saved.CRON_SECRET = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (saved.CRON_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved.CRON_SECRET;
  });

  it('accepts the secret via Authorization: Bearer (how Vercel sends it)', () => {
    process.env.CRON_SECRET = 's3cret';
    const next = vi.fn();
    requireCronSecret(makeReq({ authorization: 'Bearer s3cret' }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('accepts the secret via x-cron-secret header', () => {
    process.env.CRON_SECRET = 's3cret';
    const next = vi.fn();
    requireCronSecret(makeReq({ 'x-cron-secret': 's3cret' }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a wrong secret', () => {
    process.env.CRON_SECRET = 's3cret';
    const next = vi.fn();
    requireCronSecret(makeReq({ authorization: 'Bearer nope' }), res, next);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects everything when CRON_SECRET is not configured', () => {
    const next = vi.fn();
    requireCronSecret(makeReq({ authorization: 'Bearer anything' }), res, next);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });
});
