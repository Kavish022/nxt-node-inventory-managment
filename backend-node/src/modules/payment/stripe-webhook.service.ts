import crypto from 'crypto';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { StripeGateway } from '../../integrations/stripe/stripe.gateway';
import { BadRequestError } from '../../utils/apiError';
import { toStripeAmount } from './payment.money';
import { StripeEventRepository } from './stripe-event.repository';

function objectId(
  value: string | { id: string } | null | undefined,
): string | null {
  return typeof value === 'string' ? value : value?.id || null;
}

export class StripeWebhookService {
  static async handle(event: Stripe.Event) {
    if (event.livemode && !env.STRIPE_ALLOW_LIVE)
      throw new BadRequestError('Live Stripe events are disabled');
    if (await StripeEventRepository.exists(event.id))
      return { duplicate: true };

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const id = Number(session.metadata?.paymentId);
      if (!Number.isSafeInteger(id) || id <= 0) return { ignored: true };
      const payment = await StripeEventRepository.payment(id);
      if (
        !payment ||
        payment.reference !== session.metadata?.paymentReference ||
        payment.stripeCheckoutSessionId !== session.id
      )
        return { ignored: true };
      await StripeEventRepository.closePayment(event, id, 'EXPIRED');
      return { received: true };
    }

    let intent: Stripe.PaymentIntent;
    let success: boolean;
    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      intent = event.data.object;
      success = event.type === 'payment_intent.succeeded';
    } else if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      if (session.payment_status !== 'paid') return { ignored: true };
      const id = objectId(session.payment_intent);
      if (!id) return { ignored: true };
      intent = await StripeGateway.paymentIntent(id);
      success = intent.status === 'succeeded';
      if (!success) return { ignored: true };
    } else {
      return { ignored: true };
    }

    const id = Number(intent.metadata.paymentId);
    if (!Number.isSafeInteger(id) || id <= 0) return { ignored: true };
    const payment = await StripeEventRepository.payment(id);
    if (!payment || payment.reference !== intent.metadata.paymentReference)
      return { ignored: true };
    const expectedAmount = toStripeAmount(payment.amount, payment.currency);
    if (
      intent.amount !== expectedAmount ||
      intent.currency.toUpperCase() !== payment.currency ||
      (success && intent.amount_received !== expectedAmount) ||
      objectId(intent.transfer_data?.destination) !==
        payment.stripeDestinationAccountId ||
      objectId(intent.on_behalf_of) !== payment.stripeDestinationAccountId ||
      (payment.stripePaymentIntentId &&
        payment.stripePaymentIntentId !== intent.id)
    ) {
      throw new BadRequestError(
        'Stripe payment does not match the saved payment request',
      );
    }
    if (event.type === 'payment_intent.canceled') {
      await StripeEventRepository.closePayment(event, payment.id, 'CANCELLED');
      return { received: true };
    }
    const chargeId = success
      ? objectId(intent.latest_charge)
      : objectId(intent.last_payment_error?.charge);
    const status = success ? 'SUCCESS' : 'FAILED';
    const outcomeKey = crypto
      .createHash('sha256')
      .update(
        success
          ? `${intent.id}:SUCCESS`
          : `${intent.id}:FAILED:${chargeId || event.id}`,
      )
      .digest('hex');
    return StripeEventRepository.recordOutcome({
      eventId: event.id,
      eventType: event.type,
      eventCreatedAt: new Date(event.created * 1000),
      paymentId: payment.id,
      intentId: intent.id,
      chargeId,
      status,
      outcomeKey,
      failureCode: success
        ? undefined
        : intent.last_payment_error?.decline_code ||
          intent.last_payment_error?.code ||
          'payment_failed',
      failureReason: success
        ? undefined
        : (
            intent.last_payment_error?.message ||
            'The payment could not be completed'
          ).slice(0, 500),
    });
  }
}
