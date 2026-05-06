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
 */
export function alertsInternalRouter(service: AlertsService): Router {
  const router = Router();
  router.post(
    '/digest',
    requireCronSecret,
    asyncHandler(async (_req, res) => {
      const result = await service.runDigest();
      return ok(res, result);
    }),
  );
  return router;
}
