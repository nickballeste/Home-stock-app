import { Router } from 'express';
import { ok, created, noContent, asyncHandler } from '../../shared/response.js';
import {
  CreateMemberSchema,
  ReplaceRoutineSchema,
  UpdateMemberSchema,
} from './members.schema.js';
import type { MembersService } from './members.service.js';

export function membersRouter(service: MembersService): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const data = await service.list();
      return ok(res, data, { total: data.length });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const input = CreateMemberSchema.parse(req.body);
      const data = await service.create(input);
      return created(res, data);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const data = await service.getById(req.params.id!);
      return ok(res, data);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const input = UpdateMemberSchema.parse(req.body);
      const data = await service.update(req.params.id!, input);
      return ok(res, data);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await service.delete(req.params.id!);
      return noContent(res);
    }),
  );

  router.get(
    '/:id/routine',
    asyncHandler(async (req, res) => {
      const data = await service.getRoutine(req.params.id!);
      return ok(res, data);
    }),
  );

  router.put(
    '/:id/routine',
    asyncHandler(async (req, res) => {
      const input = ReplaceRoutineSchema.parse(req.body);
      const data = await service.replaceRoutine(req.params.id!, input);
      return ok(res, data);
    }),
  );

  return router;
}
