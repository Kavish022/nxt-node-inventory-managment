import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeGateway } from '../integrations/stripe/stripe.gateway';

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  createAccount: vi.fn(),
}));
vi.mock('../config/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mocks.createSession } },
    accounts: { create: mocks.createAccount },
  }),
}));

describe('Stripe Connect gateway', () => {
  beforeEach(() => vi.resetAllMocks());

  it('uses the saved amount and connected destination with a stable idempotency key', async () => {
    const payment = {
      id: 10,
      reference: 'fixed-reference',
      amount: new Prisma.Decimal('13.97'),
      currency: 'USD',
      description: 'Payment request',
      stripeDestinationAccountId: 'acct_receiver',
    };
    mocks.createSession.mockResolvedValue({
      id: 'cs_test',
      url: 'https://checkout.stripe.com/test',
    });
    await StripeGateway.createCheckout(payment as never, 'payer@example.com');
    await StripeGateway.createCheckout(payment as never, 'payer@example.com');
    const [params, options] = mocks.createSession.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(1397);
    expect(params.payment_intent_data).toMatchObject({
      metadata: { paymentId: '10', paymentReference: 'fixed-reference' },
      transfer_data: { destination: 'acct_receiver' },
      on_behalf_of: 'acct_receiver',
    });
    expect(params.allowed_payment_method_types).toEqual(['card']);
    expect(params.adaptive_pricing.enabled).toBe(false);
    expect(options.idempotencyKey).toBe(
      mocks.createSession.mock.calls[1][1].idempotencyKey,
    );
  });

  it('does not silently fall back to collecting into the platform account', async () => {
    await expect(
      StripeGateway.createCheckout(
        { stripeDestinationAccountId: null } as never,
        'payer@example.com',
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('requests the needed Connect capabilities without accepting an account ID from the browser', async () => {
    mocks.createAccount.mockResolvedValue({ id: 'acct_created' });
    await StripeGateway.createConnectedAccount(
      { id: 2, email: 'receiver@example.com' },
      'US',
    );
    expect(mocks.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      }),
      { idempotencyKey: 'connect-account-2' },
    );
  });
});
