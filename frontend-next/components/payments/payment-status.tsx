import { PaymentStatus } from '@/types/payment';

const styles: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  SUCCESS: 'bg-emerald-50 text-emerald-800',
  FAILED: 'bg-rose-50 text-rose-800',
  CANCELLED: 'bg-slate-100 text-slate-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status === 'SUCCESS'
        ? 'Paid'
        : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
