import { Router, raw } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { StripeWebhookController } from './stripe-webhook.controller';

const router = Router();
router.post(
  '/stripe',
  raw({ type: 'application/json', limit: '1mb' }),
  asyncHandler(StripeWebhookController.receive),
);
export const stripeWebhookRoutes = router;
