import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, ok } from '../../shared/response.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors.js';

const SignupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SALT_ROUNDS = 12;
const TOKEN_TTL = '30d';

function signToken(userId: string, email: string, name: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ sub: userId, email, name }, secret, { expiresIn: TOKEN_TTL });
}

export function authRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.post(
    '/signup',
    asyncHandler(async (req, res) => {
      const body = SignupSchema.parse(req.body);

      // Single-household app: the first account is the household owner.
      // Further signups are closed unless explicitly enabled — otherwise
      // anyone who finds the URL could create an account and read/write
      // all household data.
      const userCount = await prisma.user.count();
      if (userCount > 0 && process.env.ALLOW_SIGNUPS !== 'true') {
        throw new ConflictError(
          'SIGNUPS_CLOSED',
          'This household already has an owner. Set ALLOW_SIGNUPS=true to allow more accounts.',
        );
      }

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists');

      const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
      const user = await prisma.user.create({
        data: { email: body.email, name: body.name, passwordHash },
      });

      const token = signToken(user.id, user.email, user.name);
      return ok(res, { token, user: { id: user.id, email: user.email, name: user.name } });
    }),
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const body = LoginSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) throw new UnauthorizedError('Invalid email or password');

      const valid = await bcrypt.compare(body.password, user.passwordHash);
      if (!valid) throw new UnauthorizedError('Invalid email or password');

      const token = signToken(user.id, user.email, user.name);
      return ok(res, { token, user: { id: user.id, email: user.email, name: user.name } });
    }),
  );

  return router;
}
