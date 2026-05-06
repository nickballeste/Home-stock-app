import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, ok } from '../../shared/response.js';

export function categoriesRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
      return ok(res, cats);
    }),
  );

  return router;
}
