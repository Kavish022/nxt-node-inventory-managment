import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processReceiptJobs } from '../jobs/payment-receipt.worker';
import { PaymentGenerationRepository as Jobs } from '../modules/payment-generation/payment-generation.repository';
import { renderReceipt } from '../modules/payment-generation/receipt-renderer';

vi.mock('../modules/payment-generation/payment-generation.repository', () => ({
  PaymentGenerationRepository: {
    candidates: vi.fn(),
    claim: vi.fn(),
    receipt: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  },
}));

const receipt = {
  id: 5,
  receiptNumber: 'receipt-example',
  status: 'FAILED' as const,
  failureCode: 'card_declined',
  failureReason: 'The card was declined',
  generatedAt: new Date('2026-11-23T00:00:00Z'),
  snapshot: {
    paymentReference: 'payment-example',
    amount: '13.97',
    currency: 'USD',
    description: '<script>alert("bad")</script>',
    sender: { name: 'Payer', email: 'payer@example.com' },
    receiver: { name: 'Receiver', email: 'receiver@example.com' },
    processedAt: '2026-11-23T00:00:00Z',
    transactionReference: 'ch_failed',
  },
};
const job = {
  id: 1,
  receiptId: 5,
  attempts: 0,
  status: 'PENDING',
  updatedAt: new Date(),
  lockedAt: null,
};

describe('Payment receipt generation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Jobs.candidates).mockResolvedValue([job] as never);
    vi.mocked(Jobs.claim).mockResolvedValue({ count: 1 });
    vi.mocked(Jobs.receipt).mockResolvedValue(receipt as never);
  });

  it('escapes user content and labels failed slips correctly', () => {
    const html = renderReceipt(receipt);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('not proof of a completed payment');
    expect(html).toContain('USD 13.97');
  });

  it('creates a downloadable document from the immutable snapshot', async () => {
    await processReceiptJobs();
    expect(Jobs.complete).toHaveBeenCalledWith(
      1,
      5,
      expect.stringContaining('USD 13.97'),
      'payment-receipts/receipt-example.html',
      expect.any(Date),
    );
  });

  it('skips a job already claimed by another worker', async () => {
    vi.mocked(Jobs.claim).mockResolvedValue({ count: 0 });
    await processReceiptJobs();
    expect(Jobs.receipt).not.toHaveBeenCalled();
    expect(Jobs.complete).not.toHaveBeenCalled();
  });

  it('schedules a failed rendering job for retry without changing payment status', async () => {
    vi.mocked(Jobs.receipt).mockResolvedValue({
      ...receipt,
      snapshot: null,
    } as never);
    await processReceiptJobs();
    expect(Jobs.fail).toHaveBeenCalledWith(1, 1, expect.any(Date));
    expect(Jobs.complete).not.toHaveBeenCalled();
  });
});
