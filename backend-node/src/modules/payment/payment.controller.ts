import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { PaymentGenerationService } from '../payment-generation/payment-generation.service';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PaymentListQuery } from './payment.validation';

export class PaymentController {
  static async list(req: Request, res: Response) {
    ApiResponse.paginated(
      res,
      await PaymentRepository.list(
        req.user!.id,
        req.query as unknown as PaymentListQuery,
      ),
    );
  }

  static async detail(req: Request, res: Response) {
    ApiResponse.send(res, {
      data: await PaymentService.detail(Number(req.params.id), req.user!.id),
    });
  }

  static async people(req: Request, res: Response) {
    ApiResponse.send(res, {
      data: await PaymentRepository.people(
        req.user!.id,
        String(req.query.search || ''),
      ),
    });
  }

  static async connect(req: Request, res: Response) {
    ApiResponse.send(res, {
      data: await PaymentService.connectStatus(req.user!.id),
    });
  }

  static async onboarding(req: Request, res: Response) {
    ApiResponse.send(res, {
      data: await PaymentService.onboarding(req.user!.id, req.body.country),
    });
  }

  static async create(req: Request, res: Response) {
    ApiResponse.created(
      res,
      await PaymentService.createRequest(req.body, req.user!.id),
      'Payment requested',
    );
  }

  static async checkout(req: Request, res: Response) {
    ApiResponse.send(res, {
      data: await PaymentService.checkout(req.body.paymentId, req.user!.id),
    });
  }

  static async receipt(req: Request, res: Response) {
    const result = await PaymentGenerationService.download(
      Number(req.params.id),
      Number(req.params.receiptId),
      req.user!.id,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.type('html').send(result.html);
  }

  static async retryReceipt(req: Request, res: Response) {
    await PaymentGenerationService.retry(
      Number(req.params.id),
      Number(req.params.receiptId),
      req.user!.id,
    );
    ApiResponse.send(res, {
      message: 'Receipt generation scheduled',
      data: null,
    });
  }
}
