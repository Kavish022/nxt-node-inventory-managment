import { env } from '../../config/env';
import { isStripeConfigured } from '../../config/stripe';
import { StripeGateway } from '../../integrations/stripe/stripe.gateway';
import {
  ApiError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/apiError';
import { PaymentRepository } from './payment.repository';
import { toStripeAmount } from './payment.money';
import { CreatePaymentInput } from './payment.validation';

export class PaymentService {
  static async connectStatus(userId: number) {
    const user = await PaymentRepository.user(userId);
    if (!user) throw new NotFoundError('User not found');
    const configured = isStripeConfigured();
    if (!configured || !user.stripeAccountId) {
      return {
        configured,
        connected: Boolean(user.stripeAccountId),
        ready: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirements: [] as string[],
        testMode:
          !env.STRIPE_SECRET_KEY ||
          /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY),
      };
    }
    const account = await StripeGateway.account(user.stripeAccountId);
    return {
      configured,
      connected: true,
      ready: Boolean(
        account.charges_enabled &&
        account.payouts_enabled &&
        account.capabilities?.transfers === 'active',
      ),
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due || [],
      testMode:
        !env.STRIPE_SECRET_KEY || /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY),
    };
  }

  static async onboarding(userId: number, country?: string) {
    const user = await PaymentRepository.user(userId);
    if (!user) throw new NotFoundError('User not found');
    let accountId = user.stripeAccountId;
    if (!accountId) {
      if (!country)
        throw new BadRequestError(
          'Select the country for your connected account',
        );
      const account = await StripeGateway.createConnectedAccount(user, country);
      const saved = await PaymentRepository.saveConnectedAccount(
        userId,
        account.id,
      );
      accountId = saved?.stripeAccountId || null;
    }
    if (!accountId)
      throw new ConflictError(
        'Could not save the connected account. Please retry.',
      );
    const link = await StripeGateway.accountLink(accountId);
    return { url: link.url };
  }

  static async createRequest(input: CreatePaymentInput, receiverId: number) {
    if (input.senderId === receiverId)
      throw new BadRequestError('Select a different user as the payer');
    toStripeAmount(input.amount, input.currency);
    const sender = await PaymentRepository.user(input.senderId);
    if (!sender || sender.deletedAt || sender.accountStatus !== 'ACTIVE') {
      throw new BadRequestError('The payer must be an active user');
    }
    const status = await this.connectStatus(receiverId);
    if (!status.ready)
      throw new ConflictError(
        'Complete Stripe Connect onboarding before requesting a payment',
      );
    const receiver = await PaymentRepository.user(receiverId);
    if (!receiver?.stripeAccountId)
      throw new ConflictError('The receiver has no connected account');
    return PaymentRepository.create(
      input,
      receiverId,
      receiver.stripeAccountId,
    );
  }

  static async detail(id: number, userId: number) {
    const payment = await PaymentRepository.findById(id);
    if (
      !payment ||
      (payment.senderId !== userId && payment.receiverId !== userId)
    ) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  }

  static async checkout(id: number, userId: number) {
    if (!isStripeConfigured())
      throw new ApiError(
        503,
        'Add Stripe test credentials and a webhook secret before accepting payments',
      );
    const payment = await this.detail(id, userId);
    if (payment.senderId !== userId)
      throw new ForbiddenError('Only the payer can open Checkout');
    if (['SUCCESS', 'CANCELLED', 'EXPIRED'].includes(payment.status)) {
      throw new ConflictError('This payment is already complete or closed');
    }
    if (!(await this.connectStatus(payment.receiverId)).ready) {
      throw new ConflictError('The receiver is not ready to accept payments');
    }
    if (payment.stripeCheckoutSessionId) {
      const session = await StripeGateway.checkout(
        payment.stripeCheckoutSessionId,
      );
      if (session.status !== 'open' || !session.url)
        throw new ConflictError(
          'Checkout is complete or expired. Refresh the payment status.',
        );
      return { url: session.url };
    }
    const session = await StripeGateway.createCheckout(
      payment,
      payment.sender.email,
    );
    await PaymentRepository.saveCheckout(
      payment.id,
      session.id,
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : null,
    );
    if (!session.url)
      throw new ConflictError('Stripe did not return a Checkout URL');
    return { url: session.url };
  }
}
