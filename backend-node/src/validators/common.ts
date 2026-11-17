import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const decimalSchema = z.coerce.number().finite();
export const positiveDecimalSchema = z.coerce.number().finite().positive();
export const nonNegativeDecimalSchema = z.coerce.number().finite().nonnegative();
