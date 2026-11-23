import { PaymentGenerationRepository as Jobs } from '../modules/payment-generation/payment-generation.repository';
import { renderReceipt } from '../modules/payment-generation/receipt-renderer';

export async function processReceiptJobs() {
  const candidates = await Jobs.candidates(new Date());
  for (const job of candidates) {
    const lock = new Date();
    if (!(await Jobs.claim(job, lock)).count || job.attempts >= 5) continue;
    try {
      const receipt = await Jobs.receipt(job.receiptId);
      const html = renderReceipt(receipt);
      await Jobs.complete(
        job.id,
        receipt.id,
        html,
        `payment-receipts/${receipt.receiptNumber}.html`,
        lock,
      );
    } catch {
      await Jobs.fail(job.id, job.attempts + 1, lock);
    }
  }
}

export function startPaymentReceiptWorker(): () => Promise<void> {
  let active: Promise<void> | undefined;
  const tick = () => {
    if (active) return;
    active = processReceiptJobs()
      .catch(() => {
        console.error(
          'Payment receipt worker could not process jobs. It will retry.',
        );
      })
      .finally(() => {
        active = undefined;
      });
  };
  const timer = setInterval(tick, 5000);
  timer.unref();
  tick();
  return async () => {
    clearInterval(timer);
    await active;
  };
}
