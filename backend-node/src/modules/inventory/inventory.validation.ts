import { StockMovementType } from '@prisma/client';
import { z } from 'zod';
import { paginationQuerySchema, positiveDecimalSchema } from '../../validators/common';

export const adjustStockSchema = z.object({
  productId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  quantity: positiveDecimalSchema,
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'OPENING', 'RECONCILIATION']),
  notes: z.string().max(500).optional(),
});

export const transferStockSchema = z.object({
  productId: z.coerce.number().int().positive(),
  fromWarehouseId: z.coerce.number().int().positive(),
  toWarehouseId: z.coerce.number().int().positive(),
  quantity: positiveDecimalSchema,
  notes: z.string().max(500).optional(),
});

export const listStockQuerySchema = paginationQuerySchema.extend({
  warehouseId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  lowStock: z.coerce.boolean().optional(),
});

export const listMovementsQuerySchema = paginationQuerySchema.extend({
  productId: z.coerce.number().int().positive().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  type: z.nativeEnum(StockMovementType).optional(),
});

export const updateSettingsSchema = z.object({
  allowNegativeStock: z.boolean(),
});
