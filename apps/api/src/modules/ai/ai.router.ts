import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../shared/response.js';
import { asyncHandler } from '../../shared/response.js';
import type { AIService } from './ai.service.js';

const ExtractRoutineBody = z.object({
  prompt: z.string().min(1).max(2000),
  memberId: z.string().optional(),
});

const InferDurationBody = z.object({
  product: z.object({
    name: z.string(),
    brand: z.string().nullish(),
    category: z.string(),
    unit: z.enum(['ml', 'g', 'units', 'sheets', 'doses']),
    packageSize: z.number().positive(),
    currentQuantity: z.number().nonnegative(),
  }),
  household: z.object({
    totalWeeklyPresenceHours: z.number().nonnegative(),
    memberCount: z.number().int().min(1),
  }),
});

const ExtractProductBody = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});

export function aiRouter(ai: AIService): Router {
  const router = Router();

  router.post(
    '/extract-routine',
    asyncHandler(async (req, res) => {
      const { prompt } = ExtractRoutineBody.parse(req.body);
      const result = await ai.extractRoutineFromPrompt(prompt);
      return ok(res, result);
    }),
  );

  router.post(
    '/infer-duration',
    asyncHandler(async (req, res) => {
      const body = InferDurationBody.parse(req.body);
      const result = await ai.inferProductDuration(body);
      return ok(res, result);
    }),
  );

  router.post(
    '/extract-product-from-image',
    asyncHandler(async (req, res) => {
      const { imageBase64, mimeType } = ExtractProductBody.parse(req.body);
      const result = await ai.extractProductFromImage(imageBase64, mimeType);
      return ok(res, result);
    }),
  );

  return router;
}
