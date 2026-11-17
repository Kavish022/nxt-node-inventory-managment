import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, cn } from '../utils';

describe('Frontend Helpers & Formatters', () => {
  it('formats positive and zero currency correctly', () => {
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-05-15T00:00:00.000Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('May');
    expect(formatDate(null)).toBe('-');
  });

  it('merges tailwind class names properly using cn helper', () => {
    const classes = cn('p-4 text-sm', false && 'hidden', 'text-lg');
    expect(classes).toContain('p-4');
    expect(classes).toContain('text-lg');
    expect(classes).not.toContain('text-sm'); // tailwind-merge resolves conflicting text sizes
  });
});
