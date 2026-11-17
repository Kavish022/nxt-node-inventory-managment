import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  static async overview(req: Request, res: Response) {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const overview = await DashboardService.getOverview(warehouseId);
    ApiResponse.send(res, { data: overview });
  }

  static async analytics(req: Request, res: Response) {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const analytics = await DashboardService.getAnalytics(warehouseId);
    ApiResponse.send(res, { data: analytics });
  }

  static async recentActivities(_req: Request, res: Response) {
    const activities = await DashboardService.getRecentActivities();
    ApiResponse.send(res, { data: activities });
  }
}
