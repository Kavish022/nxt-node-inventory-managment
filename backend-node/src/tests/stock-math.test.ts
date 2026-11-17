import { describe, it, expect } from 'vitest';
import { applyStockDelta, calculateAvailableStock, moneyLineTotal } from '../utils/stockMath';

describe('Stock Math & Inventory Delta Rules', () => {
  it('correctly calculates available stock deducting reserved quantity', () => {
    const available = calculateAvailableStock(100, 25);
    expect(available.toNumber()).toBe(75);
  });

  it('adds stock successfully when incoming delta is positive', () => {
    const updated = applyStockDelta(50, 20, false);
    expect(updated.toNumber()).toBe(70);
  });

  it('throws INSUFFICIENT_STOCK error when delta causes negative stock and negative stock is disallowed', () => {
    expect(() => {
      applyStockDelta(10, -15, false);
    }).toThrowError('INSUFFICIENT_STOCK');
  });

  it('allows negative stock when allowNegativeStock is set to true', () => {
    const updated = applyStockDelta(10, -15, true);
    expect(updated.toNumber()).toBe(-5);
  });

  it('calculates money line total with discount and tax correctly', () => {
    // 10 units @ $50 each = $500, discount $50 = $450 subtotal, 10% tax = $45 tax -> $495 total
    const result = moneyLineTotal(10, 50, 10, 50);
    expect(result.subtotal.toNumber()).toBe(450);
    expect(result.taxAmount.toNumber()).toBe(45);
    expect(result.lineTotal.toNumber()).toBe(495);
  });
});
