import { ConflictError, NotFoundError } from '../../utils/apiError';
import { PaymentService } from '../payment/payment.service';
import { PaymentGenerationRepository } from './payment-generation.repository';

export class PaymentGenerationService {
  static async download(paymentId: number, receiptId: number, userId: number) {
    await PaymentService.detail(paymentId, userId);
    const receipt = await PaymentGenerationRepository.findForPayment(
      receiptId,
      paymentId,
    );
    if (!receipt) throw new NotFoundError('Receipt not found');
    if (!receipt.documentHtml)
      throw new ConflictError(
        'The receipt is still being prepared. Refresh its status or retry generation.',
      );
    return {
      html: receipt.documentHtml,
      filename: `payment-${receipt.receiptNumber}.html`,
    };
  }

  static async retry(paymentId: number, receiptId: number, userId: number) {
    await PaymentService.detail(paymentId, userId);
    const receipt = await PaymentGenerationRepository.findForPayment(
      receiptId,
      paymentId,
    );
    if (!receipt) throw new NotFoundError('Receipt not found');
    return PaymentGenerationRepository.retry(receiptId);
  }
}
