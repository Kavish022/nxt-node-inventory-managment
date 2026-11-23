import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { StripeEventRepository } from '../modules/payment/stripe-event.repository';
import { StripeWebhookService } from '../modules/payment/stripe-webhook.service';

vi.mock('../config/env', async (importOriginal) => {
  const original = await importOriginal<typeof import('../config/env')>();
  return {
    env: {
      ...original.env,
      STRIPE_SECRET_KEY: 'sk_test_local_signature_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_local_signature_test',
      STRIPE_ALLOW_LIVE: false,
    },
  };
});
vi.mock('../modules/payment/stripe-event.repository', () => ({
  StripeEventRepository: {
    exists: vi.fn(),
    payment: vi.fn(),
    recordOutcome: vi.fn(),
    closePayment: vi.fn(),
  },
}));

const stripe = new Stripe('sk_test_local_signature_test');
const app = createApp();
const payment = {
  id: 10,
  reference: 'local-reference',
  amount: new Prisma.Decimal('13.97'),
  currency: 'USD',
  stripeDestinationAccountId: 'acct_receiver',
  stripePaymentIntentId: null,
};
const intent = {
  id: 'pi_example',
  object: 'payment_intent',
  amount: 1397,
  amount_received: 1397,
  currency: 'usd',
  status: 'succeeded',
  metadata: { paymentId: '10', paymentReference: 'local-reference' },
  transfer_data: { destination: 'acct_receiver' },
  on_behalf_of: 'acct_receiver',
  latest_charge: 'ch_success',
};
function event(
  object = intent,
  type = 'payment_intent.succeeded',
  id = 'evt_example',
): Stripe.Event {
  return {
    id,
    object: 'event',
    type,
    livemode: false,
    created: 1700000000,
    data: { object },
  } as unknown as Stripe.Event;
}

describe('Stripe webhooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(StripeEventRepository.exists).mockResolvedValue(null);
    vi.mocked(StripeEventRepository.payment).mockResolvedValue(
      payment as never,
    );
    vi.mocked(StripeEventRepository.recordOutcome).mockResolvedValue({
      duplicate: false,
    });
  });

  it('verifies the original raw body before JSON parsing', async () => {
    const payload = `  ${JSON.stringify(event())}\n`;
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_local_signature_test',
    });
    const response = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);
    expect(response.status).toBe(200);
    expect(StripeEventRepository.recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 10, status: 'SUCCESS' }),
    );
  });

  it('rejects an invalid signature before touching payment data', async () => {
    const response = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 'invalid')
      .send(event());
    expect(response.status).toBe(400);
    expect(StripeEventRepository.exists).not.toHaveBeenCalled();
  });

  it('rejects unsigned webhooks', async () => {
    expect(
      (await request(app).post('/api/v1/webhooks/stripe').send(event())).status,
    ).toBe(400);
  });

  it('does not process a delivered event twice', async () => {
    vi.mocked(StripeEventRepository.exists).mockResolvedValue({
      id: 'evt_example',
    } as never);
    await expect(StripeWebhookService.handle(event())).resolves.toEqual({
      duplicate: true,
    });
    expect(StripeEventRepository.recordOutcome).not.toHaveBeenCalled();
  });

  it.each([
    { ...intent, amount: 1 },
    { ...intent, amount_received: 1 },
    { ...intent, currency: 'eur' },
    { ...intent, transfer_data: { destination: 'acct_somebody_else' } },
    { ...intent, on_behalf_of: 'acct_somebody_else' },
  ])('rejects mismatched money or recipient details', async (object) => {
    await expect(
      StripeWebhookService.handle(event(object)),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(StripeEventRepository.recordOutcome).not.toHaveBeenCalled();
  });

  it('ignores payment events not created by this application', async () => {
    await expect(
      StripeWebhookService.handle(
        event({ ...intent, metadata: {} } as typeof intent),
      ),
    ).resolves.toEqual({ ignored: true });
  });

  it('uses one outcome key for multiple success events for the same intent', async () => {
    await StripeWebhookService.handle(event());
    await StripeWebhookService.handle(
      event(intent, 'payment_intent.succeeded', 'evt_second'),
    );
    const calls = vi.mocked(StripeEventRepository.recordOutcome).mock.calls;
    expect(calls[0][0].outcomeKey).toBe(calls[1][0].outcomeKey);
  });

  it('keeps separate failed charge slips and the later successful receipt', async () => {
    for (const charge of ['ch_failed_1', 'ch_failed_2']) {
      await StripeWebhookService.handle(
        event(
          {
            ...intent,
            last_payment_error: { charge, message: 'Card declined' },
          } as typeof intent,
          'payment_intent.payment_failed',
          `evt_${charge}`,
        ),
      );
    }
    await StripeWebhookService.handle(event());
    const outcomes = vi
      .mocked(StripeEventRepository.recordOutcome)
      .mock.calls.map(([outcome]) => outcome);
    expect(new Set(outcomes.map((outcome) => outcome.outcomeKey)).size).toBe(3);
    expect(outcomes.map((outcome) => outcome.status)).toEqual([
      'FAILED',
      'FAILED',
      'SUCCESS',
    ]);
  });

  it('returns an error if durable persistence fails, allowing Stripe to retry', async () => {
    vi.mocked(StripeEventRepository.recordOutcome).mockRejectedValue(
      new Error('Database unavailable'),
    );
    await expect(StripeWebhookService.handle(event())).rejects.toThrow(
      'Database unavailable',
    );
  });

  it('rejects live events while only test payments are enabled', async () => {
    await expect(
      StripeWebhookService.handle({ ...event(), livemode: true }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
