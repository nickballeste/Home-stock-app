import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, ok } from '../../shared/response.js';
import { PrismaCategoriesRepository } from './categories.repository.js';
import { NotFoundError } from '../../shared/errors.js';

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(40).default('box'),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().min(1).max(40).optional(),
});

export function categoriesRouter(prisma: PrismaClient): Router {
  const router = Router();
  const repo = new PrismaCategoriesRepository(prisma);

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const cats = await repo.list();
      return ok(res, cats);
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = CreateCategorySchema.parse(req.body);
      const cat = await repo.create(body.name, body.icon);
      return ok(res, cat);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const body = UpdateCategorySchema.parse(req.body);
      const existing = await repo.findById(req.params.id);
      if (!existing) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
      const cat = await repo.update(req.params.id, body);
      return ok(res, cat);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await repo.findById(req.params.id);
      if (!existing) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
      await repo.delete(req.params.id);
      return ok(res, null);
    }),
  );

  return router;
}
