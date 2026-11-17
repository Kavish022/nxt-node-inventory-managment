import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { ReportsService } from './reports.service';

export class ReportsController {
  static async stockValuation(req: Request, res: Response) {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const format = req.query.format as string | undefined;

    const report = await ReportsService.getStockValuationReport({ warehouseId });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock_valuation_report.csv"');

      const headers = [
        'Stock ID',
        'Warehouse Code',
        'Warehouse Name',
        'SKU',
        'Product Name',
        'Category',
        'Quantity',
        'Reserved Qty',
        'Available Qty',
        'Cost Price',
        'Selling Price',
        'Valuation (Cost)',
        'Valuation (Retail)',
      ].join(',');

      const lines = report.items.map((r) =>
        [
          r.stockId,
          `"${r.warehouseCode}"`,
          `"${r.warehouseName}"`,
          `"${r.sku}"`,
          `"${r.productName.replace(/"/g, '""')}"`,
          `"${r.category}"`,
          r.quantity,
          r.reservedQuantity,
          r.availableQuantity,
          r.costPrice,
          r.sellingPrice,
          r.valuationAtCost,
          r.valuationAtRetail,
        ].join(',')
      );

      res.status(200).send([headers, ...lines].join('\n'));
      return;
    }

    ApiResponse.send(res, { data: report });
  }

  static async lowStock(req: Request, res: Response) {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const report = await ReportsService.getLowStockReport({ warehouseId, page, limit });
    ApiResponse.paginated(res, report);
  }

  static async stockMovements(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const report = await ReportsService.getStockMovementsReport({
      page,
      limit,
      productId,
      warehouseId,
      startDate,
      endDate,
    });
    ApiResponse.paginated(res, report);
  }

  static async purchaseReport(req: Request, res: Response) {
    const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const report = await ReportsService.getPurchaseReport({ supplierId, startDate, endDate });
    ApiResponse.send(res, { data: report });
  }

  static async salesReport(req: Request, res: Response) {
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const report = await ReportsService.getSalesReport({ customerId, startDate, endDate });
    ApiResponse.send(res, { data: report });
  }
}
