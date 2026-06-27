import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, ok } from '../../shared/response.js';

const QuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

export function systemProductsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { search, category } = QuerySchema.parse(req.query);

      const items = await prisma.systemProduct.findMany({
        where: {
          ...(category ? { categoryName: category } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { brand: { contains: search, mode: 'insensitive' } },
                  { categoryName: { contains: search, mode: 'insensitive' } },
                  { tags: { has: search.toLowerCase() } },
                ],
              }
            : {}),
        },
        orderBy: { name: 'asc' },
        take: 30,
      });

      return ok(res, items);
    }),
  );

  return router;
}
