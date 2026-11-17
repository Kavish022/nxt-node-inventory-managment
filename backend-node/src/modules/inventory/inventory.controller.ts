import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { InventoryService } from './inventory.service';
import {
  AdjustStockInput,
  ListMovementsQuery,
  ListStockQuery,
  TransferStockInput,
} from './inventory.types';

export class InventoryController {
  static async list(req: Request, res: Response) {
    const result = await InventoryService.listStock(req.query as unknown as ListStockQuery);
    ApiResponse.paginated(res, result);
  }

  static async movements(req: Request, res: Response) {
    const result = await InventoryService.listMovements(req.query as unknown as ListMovementsQuery);
    ApiResponse.paginated(res, result, 'Stock movements retrieved successfully');
  }

  static async adjust(req: Request, res: Response) {
    const body = req.body as AdjustStockInput;
    const result = await InventoryService.adjust({ ...body, createdById: req.user!.id });
    ApiResponse.send(res, { message: 'Stock updated successfully', data: result });
  }

  static async transfer(req: Request, res: Response) {
    const body = req.body as TransferStockInput;
    const result = await InventoryService.transfer({ ...body, createdById: req.user!.id });
    ApiResponse.send(res, { message: 'Stock transferred successfully', data: result });
  }

  static async settings(_req: Request, res: Response) {
    ApiResponse.send(res, { data: await InventoryService.getSettings() });
  }

  static async updateSettings(req: Request, res: Response) {
    const settings = await InventoryService.updateSettings(req.body.allowNegativeStock);
    ApiResponse.send(res, { message: 'Inventory settings updated', data: settings });
  }
}
