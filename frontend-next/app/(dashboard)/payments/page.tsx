'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { paymentAmount, paymentError, paymentPost } from '@/lib/payments';
import { ApiResponse } from '@/types';
import { ConnectStatus, PaymentList, PaymentPerson } from '@/types/payment';
import { useAuth } from '@/providers/auth-provider';
import { PaymentStatusBadge } from '@/components/payments/payment-status';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

export default function PaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [country, setCountry] = useState('');
  const [search, setSearch] = useState('');
  const [senderId, setSenderId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const connect = useQuery({
    queryKey: ['payment-connect', user?.id],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<ConnectStatus>>('/payments/connect'))
        .data.data,
    retry: false,
  });
  const payments = useQuery({
    queryKey: ['payments', user?.id, page],
    queryFn: async () =>
      (await apiClient.get<PaymentList>(`/payments?page=${page}&limit=20`))
        .data,
    refetchInterval: 15000,
  });
  const people = useQuery({
    queryKey: ['payment-people', search],
    enabled: Boolean(connect.data?.ready),
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<PaymentPerson[]>>('/payments/people', {
          params: { search },
        })
      ).data.data,
  });

  async function onboard() {
    setBusy(true);
    setError('');
    try {
      const result = await paymentPost<{ url: string }>(
        '/payments/connect/onboarding',
        connect.data?.connected ? {} : { country },
      );
      window.location.assign(result.url);
    } catch (error) {
      setError(paymentError(error));
      setBusy(false);
    }
  }
  async function requestPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await paymentPost('/payments', {
        senderId: Number(senderId),
        amount,
        currency,
        description,
      });
      setAmount('');
      setDescription('');
      setMessage(
        'Payment request sent. The payer can find it in their Payments page.',
      );
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (error) {
      setError(paymentError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Request payments, pay securely, and keep every receipt.
          </p>
        </div>
        {connect.data?.testMode && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Stripe test mode
          </span>
        )}
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Receive payments with Stripe Connect</h2>
        {connect.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">
            Checking your payment account…
          </p>
        ) : connect.error ? (
          <p role="alert" className="mt-2 text-sm text-rose-600">
            {paymentError(connect.error)}{' '}
            <button onClick={() => connect.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : !connect.data?.configured ? (
          <p className="mt-2 text-sm text-slate-500">
            Payments are not available yet. Contact your administrator to enable
            Stripe.
          </p>
        ) : connect.data.ready ? (
          <p className="mt-2 text-sm text-emerald-700">
            Your connected account is ready to accept payments.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-500">
              {connect.data.connected
                ? 'Finish your account verification with Stripe to receive payments.'
                : 'Connect your account so payments can be sent to you.'}
            </p>
            {!connect.data.connected && (
              <label className="block max-w-xs text-sm">
                Account country code
                <input
                  className={`${inputClass} mt-1`}
                  value={country}
                  onChange={(event) =>
                    setCountry(event.target.value.toUpperCase())
                  }
                  maxLength={2}
                  placeholder="e.g. US"
                  aria-label="Account country code"
                />
              </label>
            )}
            <button
              onClick={onboard}
              disabled={
                busy || (!connect.data.connected && country.length !== 2)
              }
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy
                ? 'Opening Stripe…'
                : connect.data.connected
                  ? 'Continue Stripe onboarding'
                  : 'Connect with Stripe'}
            </button>
          </div>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}
      {connect.data?.ready && (
        <form
          onSubmit={requestPayment}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-semibold">Request a payment</h2>
          <p className="text-sm text-slate-500">
            The payment will be sent to your connected Stripe account.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Find a payer
              <input
                className={`${inputClass} mt-1`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
              />
            </label>
            <label className="text-sm">
              Payer
              <select
                required
                className={`${inputClass} mt-1`}
                value={senderId}
                onChange={(event) => setSenderId(event.target.value)}
              >
                <option value="">Select a user</option>
                {people.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Amount
              <input
                required
                type="number"
                min="0.01"
                max="999999.99"
                step="0.01"
                className={`${inputClass} mt-1`}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="text-sm">
              Currency
              <select
                className={`${inputClass} mt-1`}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {['USD', 'INR', 'EUR', 'GBP'].map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
          </div>
          {people.error && (
            <p role="alert" className="text-sm text-rose-600">
              Could not load payers. Try another search.
            </p>
          )}
          <label className="block text-sm">
            What is this payment for?
            <input
              required
              minLength={3}
              maxLength={500}
              className={`${inputClass} mt-1`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button
            disabled={busy}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send payment request'}
          </button>
        </form>
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between p-5">
          <h2 className="font-semibold">Your payment history</h2>
          <button
            onClick={() => {
              payments.refetch();
              connect.refetch();
            }}
            className="text-sm font-semibold text-sky-700 dark:text-sky-400"
          >
            Refresh
          </button>
        </div>
        {payments.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading payments…</p>
        ) : payments.error ? (
          <p role="alert" className="p-6 text-sm text-rose-600">
            {paymentError(payments.error)}
          </p>
        ) : !payments.data?.data.length ? (
          <p className="p-6 text-sm text-slate-500">
            Your sent and received payment requests will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="p-4">Payment</th>
                  <th className="p-4">From / To</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.data.data.map((payment) => (
                  <tr key={payment.id}>
                    <td className="max-w-xs p-4">
                      <p className="font-medium">{payment.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {payment.senderId === user?.id
                          ? 'You pay'
                          : 'You receive'}
                      </p>
                    </td>
                    <td className="p-4">
                      <p>{payment.sender.name}</p>
                      <p className="text-xs text-slate-500">
                        to {payment.receiver.name}
                      </p>
                    </td>
                    <td className="p-4 font-semibold">
                      {paymentAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="p-4">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/payments/${payment.id}`}
                        className="font-semibold text-sky-700 dark:text-sky-400"
                      >
                        View payment
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payments.data && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm dark:border-slate-800">
            <span>
              Page {payments.data.pagination.page} of{' '}
              {payments.data.pagination.totalPages}
            </span>
            <div className="flex gap-4">
              <button
                disabled={!payments.data.pagination.hasPrevPage}
                onClick={() => setPage((value) => value - 1)}
                className="disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={!payments.data.pagination.hasNextPage}
                onClick={() => setPage((value) => value + 1)}
                className="disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
