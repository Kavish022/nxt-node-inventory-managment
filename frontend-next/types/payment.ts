export type PaymentStatus =
  'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export interface PaymentPerson {
  id: number;
  name: string;
  email: string;
}
export interface PaymentReceipt {
  id: number;
  receiptNumber: string;
  status: 'SUCCESS' | 'FAILED';
  failureCode: string | null;
  failureReason: string | null;
  generatedAt: string;
  fileKey: string | null;
  job: { status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' } | null;
}
export interface PaymentRecord {
  id: number;
  reference: string;
  senderId: number;
  receiverId: number;
  sender: PaymentPerson;
  receiver: PaymentPerson;
  amount: string;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  createdAt: string;
  processedAt: string | null;
  receipt: PaymentReceipt | null;
  attempts?: Array<{
    id: number;
    status: 'SUCCESS' | 'FAILED';
    createdAt: string;
    receipt: PaymentReceipt;
  }>;
}
export interface ConnectStatus {
  configured: boolean;
  connected: boolean;
  ready: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: string[];
  testMode: boolean;
}
export interface PaymentList {
  data: PaymentRecord[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
