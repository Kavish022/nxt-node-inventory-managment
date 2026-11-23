import { z } from 'zod';
import { PaymentGeneration } from '@prisma/client';

const snapshotSchema = z.object({
  paymentReference: z.string(),
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  sender: z.object({ name: z.string(), email: z.string() }),
  receiver: z.object({ name: z.string(), email: z.string() }),
  processedAt: z.string(),
  transactionReference: z.string(),
});

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
}

export function renderReceipt(
  receipt: Pick<
    PaymentGeneration,
    | 'receiptNumber'
    | 'status'
    | 'failureCode'
    | 'failureReason'
    | 'generatedAt'
    | 'snapshot'
  >,
): string {
  const data = snapshotSchema.parse(receipt.snapshot);
  const rows = [
    ['Receipt number', receipt.receiptNumber],
    ['Payment reference', data.paymentReference],
    ['Status', receipt.status],
    ['Amount', `${data.currency} ${data.amount}`],
    ['Sender', `${data.sender.name} (${data.sender.email})`],
    ['Receiver', `${data.receiver.name} (${data.receiver.email})`],
    ['Description', data.description || 'Payment'],
    ['Transaction', data.transactionReference],
    ['Payment event time (UTC)', new Date(data.processedAt).toISOString()],
    ['Receipt generated (UTC)', receipt.generatedAt.toISOString()],
    ...(receipt.failureReason
      ? [['Failure reason', receipt.failureReason]]
      : []),
    ...(receipt.failureCode ? [['Failure code', receipt.failureCode]] : []),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment receipt ${escape(receipt.receiptNumber)}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;color:#172033;background:#f1f5f9;margin:0;padding:40px}main{max-width:760px;background:#fff;margin:auto;padding:40px;border:1px solid #cbd5e1;border-radius:12px}h1{margin-top:0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}th{width:35%;color:#475569}footer{margin-top:24px;color:#64748b;font-size:13px}@media print{body{background:#fff;padding:0}main{border:0;padding:0}}</style></head>
<body><main><h1>${receipt.status === 'SUCCESS' ? 'Payment receipt' : 'Failed payment slip'}</h1><p>${receipt.status === 'SUCCESS' ? 'Stripe confirmed this payment succeeded.' : 'This attempt failed. This slip is not proof of a completed payment.'}</p>
<table>${rows.map(([label, value]) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`).join('')}</table><footer>FlowStock payment record. Use your browser’s Print command to print or save as PDF.</footer></main></body></html>`;
}
