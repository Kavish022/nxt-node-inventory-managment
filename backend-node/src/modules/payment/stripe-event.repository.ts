import { PaymentReceiptStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { PaymentRepository } from './payment.repository';

export interface PaymentOutcome {
  eventId: string;
  eventType: string;
  eventCreatedAt: Date;
  paymentId: number;
  intentId: string;
  chargeId: string | null;
  outcomeKey: string;
  status: PaymentReceiptStatus;
  failureCode?: string;
  failureReason?: string;
}

export class StripeEventRepository {
  static exists(id: string) {
    return prisma.stripeEvent.findUnique({ where: { id } });
  }

  static async recordOutcome(outcome: PaymentOutcome) {
    for (let retry = 0; retry < 3; retry++) {
      try {
        return await prisma.$transaction(async (tx) => {
          await tx.stripeEvent.create({
            data: {
              id: outcome.eventId,
              type: outcome.eventType,
              paymentId: outcome.paymentId,
              eventCreatedAt: outcome.eventCreatedAt,
            },
          });
          const payment = await tx.payment.findUniqueOrThrow({
            where: { id: outcome.paymentId },
            include: {
              sender: { select: { name: true, email: true } },
              receiver: { select: { name: true, email: true } },
            },
          });
          let attempt = await tx.paymentAttempt.findUnique({
            where: { outcomeKey: outcome.outcomeKey },
          });
          if (!attempt) {
            const receipt = await tx.paymentGeneration.create({
              data: {
                status: outcome.status,
                failureCode: outcome.failureCode,
                failureReason: outcome.failureReason,
                snapshot: {
                  paymentReference: payment.reference,
                  amount: payment.amount.toFixed(2),
                  currency: payment.currency,
                  description: payment.description,
                  sender: payment.sender,
                  receiver: payment.receiver,
                  processedAt: outcome.eventCreatedAt.toISOString(),
                  transactionReference: outcome.chargeId || outcome.intentId,
                },
                job: { create: {} },
              },
            });
            attempt = await tx.paymentAttempt.create({
              data: {
                paymentId: payment.id,
                outcomeKey: outcome.outcomeKey,
                stripePaymentIntentId: outcome.intentId,
                stripeChargeId: outcome.chargeId,
                status: outcome.status,
                receiptId: receipt.id,
                createdAt: outcome.eventCreatedAt,
              },
            });
          }
          // An older failed event may add attempt history, but must never downgrade a successful payment.
          await tx.payment.updateMany({
            where: {
              id: payment.id,
              ...(outcome.status === 'FAILED'
                ? {
                    status: { in: ['PENDING', 'FAILED'] as const },
                    OR: [
                      { processedAt: null },
                      { processedAt: { lte: outcome.eventCreatedAt } },
                    ],
                  }
                : {}),
            },
            data: {
              status: outcome.status,
              stripePaymentIntentId: outcome.intentId,
              receiptId: attempt.receiptId,
              transactionReference: outcome.chargeId || undefined,
              processedAt: outcome.eventCreatedAt,
            },
          });
          return { duplicate: false };
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2034'].includes(error.code)
        ) {
          if (await this.exists(outcome.eventId)) return { duplicate: true };
          if (retry < 2) continue;
        }
        throw error;
      }
    }
    throw new Error('Could not persist the Stripe event');
  }

  static async closePayment(
    event: { id: string; type: string; created: number },
    paymentId: number,
    status: 'EXPIRED' | 'CANCELLED',
  ) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.stripeEvent.create({
          data: {
            id: event.id,
            type: event.type,
            paymentId,
            eventCreatedAt: new Date(event.created * 1000),
          },
        });
        await tx.payment.updateMany({
          where: { id: paymentId, status: { in: ['PENDING', 'FAILED'] } },
          data: { status, processedAt: new Date(event.created * 1000) },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (await this.exists(event.id))
      )
        return;
      throw error;
    }
  }

  static payment(id: number) {
    return PaymentRepository.findById(id);
  }
}
