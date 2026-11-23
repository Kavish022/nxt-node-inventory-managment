import { z } from 'zod';
import { paginationQuerySchema } from '../../validators/common';

export const createPaymentSchema = z
  .object({
    senderId: z.number().int().positive(),
    amount: z
      .string()
      .regex(
        /^\d{1,8}(\.\d{1,2})?$/,
        'Use a positive amount with at most two decimal places',
      )
      .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
    currency: z.enum(['USD', 'INR', 'EUR', 'GBP']),
    description: z.string().trim().min(3).max(500),
  })
  .strict();

export const checkoutSchema = z
  .object({ paymentId: z.number().int().positive() })
  .strict();
export const onboardingSchema = z
  .object({
    country: z
      .string()
      .regex(/^[A-Z]{2}$/, 'Enter an uppercase two-letter country code')
      .optional(),
  })
  .strict();
export const paymentListSchema = paginationQuerySchema.pick({
  page: true,
  limit: true,
});
export const peopleQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentListQuery = z.infer<typeof paymentListSchema>;
