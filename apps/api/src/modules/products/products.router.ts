import { Router } from 'express';
import { asyncHandler, created, noContent, ok } from '../../shared/response.js';
import {
  AlertConfigUpdateSchema,
  CreateProductSchema,
  DurationOverrideSchema,
  ListProductsQuerySchema,
  UpdateProductSchema,
} from './products.schema.js';
import type { ProductsService } from './products.service.js';

export function productsRouter(service: ProductsService): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const filters = ListProductsQuerySchema.parse(req.query);
      const data = await service.list(filters);
      return ok(res, data, { total: data.length });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const input = CreateProductSchema.parse(req.body);
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
      const input = UpdateProductSchema.parse(req.body);
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

  router.post(
    '/:id/restock',
    asyncHandler(async (req, res) => {
      const data = await service.restock(req.params.id!);
      return ok(res, data);
    }),
  );

  router.post(
    '/:id/replace',
    asyncHandler(async (req, res) => {
      const input = CreateProductSchema.parse(req.body);
      const data = await service.replace(req.params.id!, input);
      return created(res, data);
    }),
  );

  router.patch(
    '/:id/duration',
    asyncHandler(async (req, res) => {
      const input = DurationOverrideSchema.parse(req.body);
      const data = await service.overrideDuration(req.params.id!, input);
      return ok(res, data);
    }),
  );

  router.post(
    '/:id/re-infer-duration',
    asyncHandler(async (req, res) => {
      const data = await service.reInferDuration(req.params.id!);
      return ok(res, data);
    }),
  );

  router.get(
    '/:id/alert-config',
    asyncHandler(async (req, res) => {
      const product = await service.getById(req.params.id!);
      return ok(res, product.alertConfig);
    }),
  );

  router.patch(
    '/:id/alert-config',
    asyncHandler(async (req, res) => {
      const input = AlertConfigUpdateSchema.parse(req.body);
      const product = await service.updateAlertConfig(req.params.id!, input);
      return ok(res, product.alertConfig);
    }),
  );

  return router;
}
