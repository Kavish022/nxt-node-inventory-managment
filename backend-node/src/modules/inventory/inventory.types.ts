import { z } from 'zod';
import {
  adjustStockSchema,
  listMovementsQuerySchema,
  listStockQuerySchema,
  transferStockSchema,
} from './inventory.validation';

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type TransferStockInput = z.infer<typeof transferStockSchema>;
export type ListStockQuery = z.infer<typeof listStockQuerySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
