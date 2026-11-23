import { Request, Response } from 'express';
import { StripeGateway } from '../../integrations/stripe/stripe.gateway';
import { BadRequestError } from '../../utils/apiError';
import { StripeWebhookService } from './stripe-webhook.service';

export class StripeWebhookController {
  static async receive(req: Request, res: Response) {
    const signature = req.get('stripe-signature');
    if (!signature || !Buffer.isBuffer(req.body))
      throw new BadRequestError(
        'A signed Stripe webhook with its original body is required',
      );
    const event = StripeGateway.verifyEvent(req.body, signature);
    const result = await StripeWebhookService.handle(event);
    // Acknowledge only after the outcome and durable receipt job have committed.
    res.json(result);
  }
}
