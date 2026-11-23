'use client';

import { useState } from 'react';
import { paymentError, paymentPost } from '@/lib/payments';

export function CheckoutButton({ paymentId }: { paymentId: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const result = await paymentPost<{ url: string }>('/payments/checkout', {
        paymentId,
      });
      window.location.assign(result.url);
    } catch (error) {
      setError(paymentError(error));
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={checkout}
        disabled={busy}
        className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {busy ? 'Opening secure checkout…' : 'Pay securely with Stripe'}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
