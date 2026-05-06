import express, { type Express } from 'express';
import cors from 'cors';
import { prisma } from './shared/db.js';
import { errorHandler } from './shared/response.js';
import { requireAuth } from './shared/auth.middleware.js';

import { membersRouter } from './modules/members/members.router.js';
import { MembersServiceImpl } from './modules/members/members.service.js';
import { PrismaMembersRepository } from './modules/members/members.repository.js';

import { productsRouter } from './modules/products/products.router.js';
import { ProductsServiceImpl } from './modules/products/products.service.js';
import { PrismaProductsRepository } from './modules/products/products.repository.js';

import { aiRouter } from './modules/ai/ai.router.js';
import { AnthropicAIService, type AIService } from './modules/ai/ai.service.js';

import { alertsRouter, alertsInternalRouter } from './modules/alerts/alerts.router.js';
import { AlertsServiceImpl } from './modules/alerts/alerts.service.js';
import { ResendEmailClient, NoopEmailClient, type EmailClient } from './modules/alerts/email.client.js';

import { settingsRouter } from './modules/settings/settings.router.js';
import { SettingsServiceImpl } from './modules/settings/settings.service.js';

import { categoriesRouter } from './modules/categories/categories.router.js';
import { PrismaCategoriesRepository } from './modules/categories/categories.repository.js';

export interface AppDependencies {
  ai?: AIService;
  email?: EmailClient;
}

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.use(cors({ origin: process.env.WEB_ORIGIN ?? true, credentials: true }));
  app.use(express.json({ limit: '10mb' })); // photos arrive base64-encoded

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // ── DI ────────────────────────────────────────────────────────
  const ai = deps.ai ?? new AnthropicAIService();
  const email =
    deps.email ??
    (process.env.RESEND_API_KEY
      ? new ResendEmailClient(
          process.env.RESEND_API_KEY,
          process.env.DIGEST_FROM_EMAIL ?? 'homestock@example.com',
        )
      : new NoopEmailClient());

  const membersRepo = new PrismaMembersRepository(prisma);
  const membersService = new MembersServiceImpl(membersRepo);

  const settingsService = new SettingsServiceImpl(prisma);

  const productsRepo = new PrismaProductsRepository(prisma);
  const categoriesRepo = new PrismaCategoriesRepository(prisma);
  const productsService = new ProductsServiceImpl(
    productsRepo,
    ai,
    settingsService,
    membersRepo,
    categoriesRepo,
  );

  const alertsService = new AlertsServiceImpl(
    prisma,
    productsRepo,
    productsService,
    settingsService,
    email,
  );

  // ── Public routes (auth-gated) ────────────────────────────────
  const v1 = express.Router();
  v1.use(requireAuth);
  v1.use('/members', membersRouter(membersService));
  v1.use('/products', productsRouter(productsService));
  v1.use('/categories', categoriesRouter(prisma));
  v1.use('/ai', aiRouter(ai));
  v1.use('/alerts', alertsRouter(alertsService));
  v1.use('/settings', settingsRouter(settingsService));

  // ── Internal routes (cron-secret gated) ───────────────────────
  v1.use('/internal/alerts', alertsInternalRouter(alertsService));

  app.use('/api/v1', v1);
  app.use(errorHandler);

  return app;
}
