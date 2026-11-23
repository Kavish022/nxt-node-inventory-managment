import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeGateway } from '../integrations/stripe/stripe.gateway';
import { PaymentRepository } from '../modules/payment/payment.repository';
import { PaymentService } from '../modules/payment/payment.service';
import { toStripeAmount } from '../modules/payment/payment.money';
import { checkoutSchema } from '../modules/payment/payment.validation';

vi.mock('../config/stripe', () => ({ isStripeConfigured: () => true }));
vi.mock('../integrations/stripe/stripe.gateway', () => ({
  StripeGateway: {
    account: vi.fn(),
    checkout: vi.fn(),
    createCheckout: vi.fn(),
  },
}));
vi.mock('../modules/payment/payment.repository', () => ({
  PaymentRepository: {
    user: vi.fn(),
    findById: vi.fn(),
    saveCheckout: vi.fn(),
    create: vi.fn(),
  },
}));

const payment = {
  id: 10,
  reference: 'payment-reference',
  senderId: 1,
  receiverId: 2,
  amount: new Prisma.Decimal('13.97'),
  currency: 'USD',
  status: 'PENDING',
  description: 'Tutorial payment',
  stripeCheckoutSessionId: null,
  stripePaymentIntentId: null,
  stripeDestinationAccountId: 'acct_receiver',
  sender: { id: 1, name: 'Payer', email: 'payer@example.com' },
  receiver: { id: 2, name: 'Receiver', email: 'receiver@example.com' },
  attempts: [],
  receipt: null,
};

describe('Payment business rules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(PaymentRepository.findById).mockResolvedValue(payment as never);
    vi.mocked(PaymentRepository.user).mockResolvedValue({
      id: 2,
      stripeAccountId: 'acct_receiver',
    } as never);
    vi.mocked(StripeGateway.account).mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      capabilities: { transfers: 'active' },
    } as never);
  });

  it('converts decimal amounts to exact minor units', () => {
    expect(toStripeAmount('13.97', 'USD')).toBe(1397);
    expect(toStripeAmount(new Prisma.Decimal('0.29'), 'INR')).toBe(29);
  });

  it.each(['0', '-1', '1.001', '1000000'])(
    'rejects invalid amounts (%s)',
    (amount) => {
      expect(() => toStripeAmount(amount, 'USD')).toThrow();
    },
  );

  it('rejects unsupported currency precision and client price overrides', () => {
    expect(() => toStripeAmount('100', 'JPY')).toThrow();
    expect(
      checkoutSchema.safeParse({ paymentId: 10, amount: '0.01' }).success,
    ).toBe(false);
  });

  it('hides payments from users who are not participants', async () => {
    await expect(PaymentService.detail(10, 3)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('does not let a receiver pay on behalf of the sender', async () => {
    await expect(PaymentService.checkout(10, 2)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(StripeGateway.createCheckout).not.toHaveBeenCalled();
  });

  it('rejects payments to oneself', async () => {
    await expect(
      PaymentService.createRequest(
        {
          senderId: 2,
          amount: '10',
          currency: 'USD',
          description: 'Test request',
        },
        2,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not collect payment before the receiver can receive funds', async () => {
    vi.mocked(StripeGateway.account).mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: false,
    } as never);
    await expect(PaymentService.checkout(10, 1)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(StripeGateway.createCheckout).not.toHaveBeenCalled();
  });

  it('reuses an open Checkout Session after a failed attempt', async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({
      ...payment,
      status: 'FAILED',
      stripeCheckoutSessionId: 'cs_existing',
    } as never);
    vi.mocked(StripeGateway.checkout).mockResolvedValue({
      status: 'open',
      url: 'https://checkout.stripe.com/existing',
    } as never);
    await expect(PaymentService.checkout(10, 1)).resolves.toEqual({
      url: 'https://checkout.stripe.com/existing',
    });
    expect(StripeGateway.createCheckout).not.toHaveBeenCalled();
  });

  it.each(['SUCCESS', 'CANCELLED', 'EXPIRED'])(
    'does not reopen a %s payment',
    async (status) => {
      vi.mocked(PaymentRepository.findById).mockResolvedValue({
        ...payment,
        status,
      } as never);
      await expect(PaymentService.checkout(10, 1)).rejects.toMatchObject({
        statusCode: 409,
      });
    },
  );
});
