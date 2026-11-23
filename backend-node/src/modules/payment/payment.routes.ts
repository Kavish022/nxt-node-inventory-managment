import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/auth.middleware';
import { csrfProtection } from '../../middlewares/csrf.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParamSchema } from '../../validators/common';
import { PaymentController } from './payment.controller';
import {
  checkoutSchema,
  createPaymentSchema,
  onboardingSchema,
  paymentListSchema,
  peopleQuerySchema,
} from './payment.validation';

const router = Router();
router.use(authenticate);
router.use(
  rateLimit({
    windowMs: 60000,
    max: 120,
    keyGenerator: (req) => String(req.user!.id),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const mutationLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => String(req.user!.id),
  standardHeaders: true,
  legacyHeaders: false,
});
router.use((req, res, next) =>
  req.method === 'POST' ? mutationLimit(req, res, next) : next(),
);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.get(
  '/',
  validate({ query: paymentListSchema }),
  asyncHandler(PaymentController.list),
);
router.get(
  '/people',
  validate({ query: peopleQuerySchema }),
  asyncHandler(PaymentController.people),
);
router.get('/connect', asyncHandler(PaymentController.connect));
router.post(
  '/connect/onboarding',
  csrfProtection,
  validate({ body: onboardingSchema }),
  asyncHandler(PaymentController.onboarding),
);
router.post(
  '/',
  csrfProtection,
  validate({ body: createPaymentSchema }),
  asyncHandler(PaymentController.create),
);
router.post(
  '/checkout',
  csrfProtection,
  validate({ body: checkoutSchema }),
  asyncHandler(PaymentController.checkout),
);
router.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(PaymentController.detail),
);
const receiptParams = idParamSchema.extend({
  receiptId: z.coerce.number().int().positive(),
});
router.get(
  '/:id/receipts/:receiptId',
  validate({ params: receiptParams }),
  asyncHandler(PaymentController.receipt),
);
router.post(
  '/:id/receipts/:receiptId/retry',
  csrfProtection,
  validate({ params: receiptParams }),
  asyncHandler(PaymentController.retryReceipt),
);
export const paymentRoutes = router;
