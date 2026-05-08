import { z } from 'zod';

const UnitEnum = z.enum(['ml', 'g', 'units', 'sheets', 'doses']);
const ScopeEnum = z.enum(['all', 'specific']);

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(80).nullish(),
  categoryId: z.string().min(1).optional(),
  unit: UnitEnum,
  packageSize: z.number().positive(),
  currentQuantity: z.number().nonnegative(),
  consumerScope: ScopeEnum.default('all'),
  consumerMemberIds: z.array(z.string()).default([]),
  estimatedDurationDays: z.number().int().positive().optional(),
  estimatedEndDate: z.string().datetime().optional(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  brand: z.string().max(80).nullish(),
  categoryId: z.string().min(1).optional(),
  unit: UnitEnum.optional(),
  packageSize: z.number().positive().optional(),
  currentQuantity: z.number().nonnegative().optional(),
  consumerScope: ScopeEnum.optional(),
  consumerMemberIds: z.array(z.string()).optional(),
});

export const DurationOverrideSchema = z
  .object({
    estimatedDurationDays: z.number().int().positive().optional(),
    estimatedEndDate: z.string().datetime().optional(),
  })
  .refine((v) => v.estimatedDurationDays !== undefined || v.estimatedEndDate !== undefined, {
    message: 'Provide either estimatedDurationDays or estimatedEndDate',
  });

export const AlertConfigUpdateSchema = z.object({
  overrideThresholdDays: z.number().int().min(0).nullable().optional(),
  emailEnabled: z.boolean().optional(),
});

export const ListProductsQuerySchema = z.object({
  status: z.enum(['ok', 'alert', 'overdue']).optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['name', 'endDate', 'category']).optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type DurationOverrideDto = z.infer<typeof DurationOverrideSchema>;
export type AlertConfigUpdateDto = z.infer<typeof AlertConfigUpdateSchema>;
export type ListProductsQueryDto = z.infer<typeof ListProductsQuerySchema>;
