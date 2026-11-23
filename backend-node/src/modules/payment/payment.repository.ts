import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { buildPagination } from '../../utils/pagination';
import { CreatePaymentInput, PaymentListQuery } from './payment.validation';

export const receiptSummarySelect = {
  id: true,
  receiptNumber: true,
  status: true,
  failureCode: true,
  failureReason: true,
  generatedAt: true,
  fileKey: true,
  job: { select: { status: true } },
} satisfies Prisma.PaymentGenerationSelect;

const paymentInclude = {
  sender: { select: { id: true, name: true, email: true } },
  receiver: { select: { id: true, name: true, email: true } },
  receipt: { select: receiptSummarySelect },
} satisfies Prisma.PaymentInclude;

export class PaymentRepository {
  static user(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        stripeAccountId: true,
        accountStatus: true,
        deletedAt: true,
      },
    });
  }

  static async saveConnectedAccount(userId: number, accountId: string) {
    await prisma.user.updateMany({
      where: { id: userId, stripeAccountId: null },
      data: { stripeAccountId: accountId },
    });
    return this.user(userId);
  }

  static people(userId: number, search: string) {
    return prisma.user.findMany({
      where: {
        id: { not: userId },
        accountStatus: 'ACTIVE',
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  static create(
    input: CreatePaymentInput,
    receiverId: number,
    destination: string,
  ) {
    return prisma.payment.create({
      data: {
        senderId: input.senderId,
        receiverId,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        description: input.description,
        stripeDestinationAccountId: destination,
      },
      include: paymentInclude,
    });
  }

  static findById(id: number) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        ...paymentInclude,
        attempts: {
          orderBy: { createdAt: 'desc' },
          include: { receipt: { select: receiptSummarySelect } },
        },
      },
    });
  }

  static async list(userId: number, query: PaymentListQuery) {
    const where = { OR: [{ senderId: userId }, { receiverId: userId }] };
    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.payment.count({ where }),
    ]);
    return buildPagination(items, query.page, query.limit, total);
  }

  static async saveCheckout(
    id: number,
    sessionId: string,
    intentId: string | null,
  ) {
    return prisma.payment.updateMany({
      where: { id, stripeCheckoutSessionId: null },
      data: {
        stripeCheckoutSessionId: sessionId,
        ...(intentId ? { stripePaymentIntentId: intentId } : {}),
      },
    });
  }
}
