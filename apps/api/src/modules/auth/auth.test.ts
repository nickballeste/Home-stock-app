import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { authRouter } from './auth.router.js';
import { errorHandler } from '../../shared/response.js';

const savedEnv: Record<string, string | undefined> = {};

function makePrisma(opts: { userCount?: number; existingUser?: unknown } = {}) {
  return {
    user: {
      count: vi.fn().mockResolvedValue(opts.userCount ?? 0),
      findUnique: vi.fn().mockResolvedValue(opts.existingUser ?? null),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'u1',
        ...data,
      })),
    },
  } as unknown as PrismaClient;
}

function makeApp(prisma: PrismaClient) {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter(prisma));
  app.use(errorHandler);
  return app;
}

describe('auth router', () => {
  beforeEach(() => {
    savedEnv.JWT_SECRET = process.env.JWT_SECRET;
    savedEnv.ALLOW_SIGNUPS = process.env.ALLOW_SIGNUPS;
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.ALLOW_SIGNUPS;
  });

  afterEach(() => {
    for (const k of ['JWT_SECRET', 'ALLOW_SIGNUPS']) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  describe('POST /auth/signup', () => {
    it('creates the first account and returns a token', async () => {
      const app = makeApp(makePrisma({ userCount: 0 }));
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'nick@example.com', name: 'Nick', password: 'supersecret' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.email).toBe('nick@example.com');
    });

    it('closes signups once an owner exists', async () => {
      const app = makeApp(makePrisma({ userCount: 1 }));
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'stranger@example.com', name: 'Stranger', password: 'supersecret' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SIGNUPS_CLOSED');
    });

    it('allows further signups when ALLOW_SIGNUPS=true', async () => {
      process.env.ALLOW_SIGNUPS = 'true';
      const app = makeApp(makePrisma({ userCount: 1 }));
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'partner@example.com', name: 'Partner', password: 'supersecret' });

      expect(res.status).toBe(200);
    });

    it('rejects short passwords', async () => {
      const app = makeApp(makePrisma());
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'nick@example.com', name: 'Nick', password: 'short' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('supersecret', 4);
      const app = makeApp(
        makePrisma({
          existingUser: { id: 'u1', email: 'nick@example.com', name: 'Nick', passwordHash },
        }),
      );
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nick@example.com', password: 'supersecret' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
    });

    it('rejects a wrong password with 401', async () => {
      const passwordHash = await bcrypt.hash('supersecret', 4);
      const app = makeApp(
        makePrisma({
          existingUser: { id: 'u1', email: 'nick@example.com', name: 'Nick', passwordHash },
        }),
      );
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nick@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('rejects an unknown email with 401 (no user enumeration)', async () => {
      const app = makeApp(makePrisma());
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: 'whatever' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).not.toMatch(/no user|not found/i);
    });
  });
});
