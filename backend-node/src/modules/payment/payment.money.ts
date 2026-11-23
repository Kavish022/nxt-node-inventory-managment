import { Prisma } from '@prisma/client';
import { BadRequestError } from '../../utils/apiError';

// The supported currencies all have two decimal places. Never convert through floating-point arithmetic.
export function toStripeAmount(
  amount: Prisma.Decimal | string,
  currency: string,
): number {
  if (!['USD', 'INR', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
    throw new BadRequestError('This currency is not supported');
  }
  const minor = new Prisma.Decimal(amount).mul(100);
  if (!minor.isInteger() || minor.lte(0) || minor.gt(99999999)) {
    throw new BadRequestError(
      'The payment amount must be between 0.01 and 999999.99',
    );
  }
  return minor.toNumber();
}
