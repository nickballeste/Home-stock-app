import { Router } from 'express';
import { asyncHandler, ok } from '../../shared/response.js';
import { UpdateSettingsSchema, type SettingsService } from './settings.service.js';

export function settingsRouter(service: SettingsService): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const data = await service.get();
      return ok(res, data);
    }),
  );

  router.patch(
    '/',
    asyncHandler(async (req, res) => {
      const input = UpdateSettingsSchema.parse(req.body);
      const data = await service.update(input);
      return ok(res, data);
    }),
  );

  return router;
}
