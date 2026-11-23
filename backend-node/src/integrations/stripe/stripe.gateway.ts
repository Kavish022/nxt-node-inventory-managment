import Stripe from 'stripe';
import { Payment } from '@prisma/client';
import { env } from '../../config/env';
import { getStripe } from '../../config/stripe';
import { ApiError, BadRequestError } from '../../utils/apiError';
import { toStripeAmount } from '../../modules/payment/payment.money';

export class StripeGateway {
  static async createConnectedAccount(
    user: { id: number; email: string },
    country: string,
  ) {
    return getStripe().accounts.create(
      {
        type: 'express',
        country,
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { userId: String(user.id) },
      },
      { idempotencyKey: `connect-account-${user.id}` },
    );
  }

  static async accountLink(accountId: string) {
    const base = env.APP_BASE_URL.replace(/\/$/, '');
    return getStripe().accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${base}/payments?onboarding=refresh`,
      return_url: `${base}/payments?onboarding=return`,
    });
  }

  static async account(accountId: string) {
    return getStripe().accounts.retrieve(accountId);
  }

  static async createCheckout(payment: Payment, email: string) {
    if (!payment.stripeDestinationAccountId) {
      throw new BadRequestError(
        'The receiver has not connected a Stripe account',
      );
    }
    const base = env.APP_BASE_URL.replace(/\/$/, '');
    const metadata = {
      paymentId: String(payment.id),
      paymentReference: payment.reference,
    };
    return getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        allowed_payment_method_types: ['card'],
        customer_email: email,
        adaptive_pricing: { enabled: false },
        client_reference_id: payment.reference,
        metadata,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: payment.currency.toLowerCase(),
              unit_amount: toStripeAmount(payment.amount, payment.currency),
              product_data: {
                name: payment.description || `Payment ${payment.reference}`,
              },
            },
          },
        ],
        payment_intent_data: {
          metadata,
          transfer_data: { destination: payment.stripeDestinationAccountId },
          on_behalf_of: payment.stripeDestinationAccountId,
        },
        success_url: `${base}/payments/${payment.id}?checkout=returned`,
        cancel_url: `${base}/payments/${payment.id}?checkout=cancelled`,
      },
      { idempotencyKey: `checkout-${payment.reference}` },
    );
  }

  static async checkout(sessionId: string) {
    return getStripe().checkout.sessions.retrieve(sessionId);
  }

  static async paymentIntent(id: string) {
    return getStripe().paymentIntents.retrieve(id);
  }

  static verifyEvent(body: Buffer, signature: string): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new ApiError(
        503,
        'Stripe webhook signing secret is not configured',
      );
    }
    try {
      return getStripe().webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestError('Invalid Stripe webhook payload');
      }
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        throw new BadRequestError('Invalid Stripe webhook signature');
      }
      throw error;
    }
  }
}
