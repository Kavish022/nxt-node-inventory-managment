import crypto from 'crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../config/db';
import { StripeEventRepository } from '../modules/payment/stripe-event.repository';

// Run explicitly against the configured test database. Every inserted row is rolled back.
describe.runIf(process.env.RUN_PAYMENT_DB_TESTS === 'true')(
  'Payment database invariants',
  () => {
    afterAll(() => prisma.$disconnect());

    it('preserves failed slips, deduplicates retries, and never downgrades a successful payment', async () => {
      const key = crypto.randomUUID();
      const rollback = new Error('Intentional payment-test rollback');
      const transaction = prisma.$transaction.bind(prisma);
      let reference = '';
      let exercised = false;
      try {
        await transaction(
          async (tx) => {
            const role = await tx.role.findFirstOrThrow();
            const sender = await tx.user.create({
              data: {
                name: 'Rollback test payer',
                email: `payer-${key}@example.invalid`,
                passwordHash: 'not-a-real-login-hash',
                roleId: role.id,
              },
            });
            const receiver = await tx.user.create({
              data: {
                name: 'Rollback test receiver',
                email: `receiver-${key}@example.invalid`,
                passwordHash: 'not-a-real-login-hash',
                roleId: role.id,
              },
            });
            const payment = await tx.payment.create({
              data: {
                senderId: sender.id,
                receiverId: receiver.id,
                amount: '13.97',
                currency: 'USD',
                description: 'Rollback-only integration test',
              },
            });
            reference = payment.reference;
            const transactionSpy = vi
              .spyOn(prisma, '$transaction')
              .mockImplementation((async (callback: unknown) => {
                if (typeof callback !== 'function')
                  throw new Error('Unexpected batch transaction');
                return callback(tx);
              }) as never);
            const eventSpy = vi
              .spyOn(StripeEventRepository, 'exists')
              .mockImplementation((id) =>
                tx.stripeEvent.findUnique({ where: { id } }),
              );
            try {
              const firstFailure = {
                eventId: `evt_fail_${key}`,
                eventType: 'payment_intent.payment_failed',
                eventCreatedAt: new Date('2026-11-23T00:00:00Z'),
                paymentId: payment.id,
                intentId: `pi_${key}`,
                chargeId: `ch_fail_${key}`,
                outcomeKey: `failed_${key}`,
                status: 'FAILED' as const,
                failureReason: 'Declined',
              };
              await StripeEventRepository.recordOutcome(firstFailure);
              expect(
                (
                  await tx.payment.findUniqueOrThrow({
                    where: { id: payment.id },
                  })
                ).status,
              ).toBe('FAILED');
              expect(
                await StripeEventRepository.recordOutcome(firstFailure),
              ).toEqual({ duplicate: true });
              const success = {
                ...firstFailure,
                eventId: `evt_success_${key}`,
                eventType: 'payment_intent.succeeded',
                eventCreatedAt: new Date('2026-11-23T00:01:00Z'),
                chargeId: `ch_success_${key}`,
                outcomeKey: `success_${key}`,
                status: 'SUCCESS' as const,
                failureReason: undefined,
              };
              await StripeEventRepository.recordOutcome(success);
              // A separate success delivery for the same intent must not generate another receipt.
              await StripeEventRepository.recordOutcome({
                ...success,
                eventId: `evt_success_again_${key}`,
              });
              await StripeEventRepository.recordOutcome({
                ...firstFailure,
                eventId: `evt_late_failure_${key}`,
                chargeId: `ch_late_${key}`,
                outcomeKey: `late_failure_${key}`,
              });
              const saved = await tx.payment.findUniqueOrThrow({
                where: { id: payment.id },
                include: {
                  receipt: true,
                  attempts: {
                    include: { receipt: { include: { job: true } } },
                  },
                },
              });
              expect(saved.status).toBe('SUCCESS');
              expect(saved.receipt?.status).toBe('SUCCESS');
              expect(saved.attempts).toHaveLength(3);
              expect(
                saved.attempts.filter((attempt) => attempt.status === 'FAILED'),
              ).toHaveLength(2);
              expect(
                saved.attempts.every(
                  (attempt) => attempt.receipt.job?.status === 'PENDING',
                ),
              ).toBe(true);
              expect(
                new Set(saved.attempts.map((attempt) => attempt.receiptId))
                  .size,
              ).toBe(3);
              expect(
                await tx.stripeEvent.count({
                  where: { paymentId: payment.id },
                }),
              ).toBe(4);
              exercised = true;
            } finally {
              transactionSpy.mockRestore();
              eventSpy.mockRestore();
            }
            throw rollback;
          },
          { timeout: 45000, maxWait: 10000 },
        );
      } catch (error) {
        if (error !== rollback) throw error;
      }
      expect(exercised).toBe(true);
      expect(await prisma.payment.count({ where: { reference } })).toBe(0);
    }, 60000);
  },
);
