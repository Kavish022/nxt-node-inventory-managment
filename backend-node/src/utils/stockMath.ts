import { Prisma } from '@prisma/client';

export function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function addDecimal(left: Prisma.Decimal | number | string, right: Prisma.Decimal | number | string): Prisma.Decimal {
  return toDecimal(left).plus(toDecimal(right));
}

export function subtractDecimal(
  left: Prisma.Decimal | number | string,
  right: Prisma.Decimal | number | string
): Prisma.Decimal {
  return toDecimal(left).minus(toDecimal(right));
}

export function calculateAvailableStock(
  quantity: Prisma.Decimal | number | string,
  reservedQuantity: Prisma.Decimal | number | string
): Prisma.Decimal {
  return subtractDecimal(quantity, reservedQuantity);
}

export function applyStockDelta(
  currentQuantity: Prisma.Decimal | number | string,
  delta: Prisma.Decimal | number | string,
  allowNegativeStock: boolean
): Prisma.Decimal {
  const nextQuantity = addDecimal(currentQuantity, delta);

  if (!allowNegativeStock && nextQuantity.lessThan(0)) {
    throw new Error('INSUFFICIENT_STOCK');
  }

  return nextQuantity;
}

export function moneyLineTotal(
  quantity: Prisma.Decimal | number | string,
  unitPrice: Prisma.Decimal | number | string,
  taxRate: Prisma.Decimal | number | string,
  discountAmount: Prisma.Decimal | number | string
): { subtotal: Prisma.Decimal; taxAmount: Prisma.Decimal; lineTotal: Prisma.Decimal } {
  const subtotal = toDecimal(quantity).times(toDecimal(unitPrice)).minus(toDecimal(discountAmount));
  const taxAmount = subtotal.times(toDecimal(taxRate)).dividedBy(100);
  const lineTotal = subtotal.plus(taxAmount);

  return {
    subtotal: subtotal.toDecimalPlaces(2),
    taxAmount: taxAmount.toDecimalPlaces(2),
    lineTotal: lineTotal.toDecimalPlaces(2),
  };
}
