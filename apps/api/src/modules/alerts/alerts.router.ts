import { Router } from 'express';
import { asyncHandler, ok } from '../../shared/response.js';
import type { AlertsService } from './alerts.service.js';
import { requireCronSecret } from '../../shared/auth.middleware.js';

export function alertsRouter(service: AlertsService): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const data = await service.listActive();
      return ok(res, data, { total: data.length });
    }),
  );

  router.get(
    '/summary',
    asyncHandler(async (_req, res) => {
      const data = await service.summary();
      return ok(res, data);
    }),
  );

  return router;
}

/**
 * Internal cron-only routes (mounted separately, behind requireCronSecret).
 * Vercel Cron invokes the path with a GET request, so both GET and POST
 * are accepted.
 */
export function alertsInternalRouter(service: AlertsService): Router {
  const router = Router();
  const handler = asyncHandler(async (_req, res) => {
    const result = await service.runDigest();
    return ok(res, result);
  });
  router.get('/digest', requireCronSecret, handler);
  router.post('/digest', requireCronSecret, handler);
  return router;
}
