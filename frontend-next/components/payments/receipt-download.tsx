'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { paymentPost } from '@/lib/payments';
import { PaymentReceipt } from '@/types/payment';

export function ReceiptDownload({
  paymentId,
  receipt,
  onRetry,
}: {
  paymentId: number;
  receipt: PaymentReceipt;
  onRetry: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function action() {
    setBusy(true);
    setError('');
    try {
      if (receipt.job?.status === 'FAILED') {
        await paymentPost(
          `/payments/${paymentId}/receipts/${receipt.id}/retry`,
        );
        onRetry();
      } else {
        const response = await apiClient.get(
          `/payments/${paymentId}/receipts/${receipt.id}`,
          { responseType: 'blob' },
        );
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-${receipt.receiptNumber}.html`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setError('The receipt is unavailable. Refresh and try again.');
    } finally {
      setBusy(false);
    }
  }
  const failed = receipt.job?.status === 'FAILED';
  return (
    <div>
      <button
        type="button"
        onClick={action}
        disabled={busy || (!receipt.fileKey && !failed)}
        className="text-sm font-semibold text-sky-700 underline disabled:cursor-wait disabled:text-slate-400 dark:text-sky-400"
      >
        {busy
          ? 'Please wait…'
          : failed
            ? 'Retry receipt generation'
            : receipt.fileKey
              ? 'Download receipt'
              : 'Preparing receipt…'}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
