import { PaymentReceiptJob, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';

export class PaymentGenerationRepository {
  static findForPayment(receiptId: number, paymentId: number) {
    return prisma.paymentGeneration.findFirst({
      where: {
        id: receiptId,
        OR: [{ payment: { id: paymentId } }, { attempt: { paymentId } }],
      },
      include: { job: true },
    });
  }

  static retry(receiptId: number) {
    return prisma.paymentReceiptJob.updateMany({
      where: { receiptId, status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        lockedAt: null,
        lastError: null,
        nextAttemptAt: new Date(),
      },
    });
  }

  static candidates(now: Date) {
    return prisma.paymentReceiptJob.findMany({
      where: {
        OR: [
          { status: 'PENDING', nextAttemptAt: { lte: now } },
          {
            status: 'PROCESSING',
            lockedAt: { lt: new Date(now.getTime() - 120000) },
          },
        ],
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 10,
    });
  }

  static claim(job: PaymentReceiptJob, now: Date) {
    return prisma.paymentReceiptJob.updateMany({
      where: {
        id: job.id,
        updatedAt: job.updatedAt,
        status: job.status,
        lockedAt: job.lockedAt,
        attempts: job.attempts,
      },
      data: {
        status: job.attempts >= 5 ? 'FAILED' : 'PROCESSING',
        attempts: { increment: 1 },
        lockedAt: now,
      },
    });
  }

  static receipt(id: number) {
    return prisma.paymentGeneration.findUniqueOrThrow({ where: { id } });
  }

  static async complete(
    jobId: number,
    receiptId: number,
    html: string,
    fileKey: string,
    lock: Date,
  ) {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentReceiptJob.updateMany({
        where: { id: jobId, status: 'PROCESSING', lockedAt: lock },
        data: { status: 'COMPLETE', lockedAt: null, lastError: null },
      });
      if (claimed.count)
        await tx.paymentGeneration.update({
          where: { id: receiptId },
          data: { documentHtml: html, fileKey },
        });
    });
  }

  static fail(id: number, attempts: number, lock: Date) {
    const data: Prisma.PaymentReceiptJobUpdateManyMutationInput = {
      status: attempts >= 5 ? 'FAILED' : 'PENDING',
      lockedAt: null,
      lastError: 'Receipt generation failed. The job can be retried.',
      nextAttemptAt: new Date(
        Date.now() + Math.min(300000, 5000 * 2 ** attempts),
      ),
    };
    return prisma.paymentReceiptJob.updateMany({
      where: { id, status: 'PROCESSING', lockedAt: lock },
      data,
    });
  }
}
