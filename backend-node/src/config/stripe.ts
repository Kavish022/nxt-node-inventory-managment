import Stripe from 'stripe';
import { env } from './env';
import { ApiError } from '../utils/apiError';

let client: Stripe | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET &&
    (env.STRIPE_ALLOW_LIVE || /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)),
  );
}

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(
      503,
      'Stripe is not configured. Add Stripe test credentials to the backend environment.',
    );
  }
  if (!env.STRIPE_ALLOW_LIVE && !/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)) {
    throw new ApiError(
      503,
      'Live Stripe payments are disabled. Use a Stripe test key.',
    );
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 20000,
  });
  return client;
}
