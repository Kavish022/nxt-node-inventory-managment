'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { paymentAmount, paymentError } from '@/lib/payments';
import { ApiResponse } from '@/types';
import { PaymentRecord } from '@/types/payment';
import { useAuth } from '@/providers/auth-provider';
import { CheckoutButton } from '@/components/payments/checkout-button';
import { PaymentStatusBadge } from '@/components/payments/payment-status';
import { ReceiptDownload } from '@/components/payments/receipt-download';

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { user } = useAuth();
  const payment = useQuery({
    queryKey: ['payment', user?.id, params.id],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<PaymentRecord>>(
          `/payments/${params.id}`,
        )
      ).data.data,
    retry: false,
    refetchInterval: (query) => {
      const record = query.state.data;
      const preparingReceipt = record?.attempts?.some((attempt) =>
        ['PENDING', 'PROCESSING'].includes(attempt.receipt.job?.status || ''),
      );
      return record &&
        (record.status === 'PENDING' ||
          record.status === 'FAILED' ||
          preparingReceipt)
        ? 5000
        : false;
    },
  });
  if (payment.isLoading)
    return <p className="text-sm text-slate-500">Loading payment…</p>;
  if (payment.error || !payment.data)
    return (
      <div className="space-y-4">
        <p role="alert" className="text-rose-600">
          {paymentError(payment.error)}
        </p>
        <Link href="/payments" className="text-sky-700 underline">
          Back to payments
        </Link>
      </div>
    );
  const record = payment.data;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/payments"
        className="text-sm font-semibold text-sky-700 dark:text-sky-400"
      >
        ← All payments
      </Link>
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {record.description || 'Payment details'}
            </h1>
            <p className="mt-2 break-all font-mono text-xs text-slate-500">
              {record.reference}
            </p>
          </div>
          <PaymentStatusBadge status={record.status} />
        </div>
        <p className="text-3xl font-bold">
          {paymentAmount(record.amount, record.currency)}
        </p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Payer</dt>
            <dd className="mt-1 font-medium">{record.sender.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Receiver</dt>
            <dd className="mt-1 font-medium">{record.receiver.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-1">
              {new Date(record.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Last payment result</dt>
            <dd className="mt-1">
              {record.processedAt
                ? new Date(record.processedAt).toLocaleString()
                : 'Awaiting payment'}
            </dd>
          </div>
        </dl>
        {search.get('checkout') === 'cancelled' &&
          record.status !== 'SUCCESS' && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800">
              You returned from Checkout. Returning here does not cancel or
              confirm a payment.
            </p>
          )}
        {record.status === 'PENDING' &&
          search.get('checkout') === 'returned' && (
            <p
              role="status"
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
            >
              Waiting for Stripe to confirm the payment. This page checks
              automatically.
            </p>
          )}
        {record.status === 'SUCCESS' && (
          <p className="text-sm text-emerald-700">
            Stripe confirmed this payment succeeded. Receipt generation runs
            separately.
          </p>
        )}
        {record.senderId === user?.id &&
          ['PENDING', 'FAILED'].includes(record.status) && (
            <CheckoutButton paymentId={record.id} />
          )}
        <button
          onClick={() => payment.refetch()}
          className="text-sm font-semibold text-sky-700 dark:text-sky-400"
        >
          Refresh status
        </button>
      </section>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Attempts and receipts</h2>
        {!record.attempts?.length ? (
          <p className="text-sm text-slate-500">
            Confirmed payment attempts and their slips will appear here.
          </p>
        ) : (
          record.attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="flex flex-wrap items-start justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800"
            >
              <div>
                <PaymentStatusBadge status={attempt.status} />
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(attempt.createdAt).toLocaleString()}
                </p>
                {attempt.receipt.failureReason && (
                  <p className="mt-2 text-sm text-rose-600">
                    {attempt.receipt.failureReason}
                  </p>
                )}
                <p className="mt-1 break-all font-mono text-xs text-slate-400">
                  {attempt.receipt.receiptNumber}
                </p>
              </div>
              <ReceiptDownload
                paymentId={record.id}
                receipt={attempt.receipt}
                onRetry={() => {
                  payment.refetch();
                }}
              />
            </div>
          ))
        )}
        <p className="text-xs text-slate-500">
          Downloaded receipts are printable HTML files. Open the file and use
          Print to save it as PDF.
        </p>
      </section>
    </div>
  );
}
