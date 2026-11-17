import { Router } from 'express';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ReportsController } from './reports.controller';

const router = Router();
router.use(authenticate);

router.get(
  '/valuation',
  requirePermission(Permissions.REPORTS_READ),
  asyncHandler(ReportsController.stockValuation)
);

router.get(
  '/low-stock',
  requirePermission(Permissions.REPORTS_READ),
  asyncHandler(ReportsController.lowStock)
);

router.get(
  '/movements',
  requirePermission(Permissions.REPORTS_READ),
  asyncHandler(ReportsController.stockMovements)
);

router.get(
  '/purchases',
  requirePermission(Permissions.REPORTS_READ),
  asyncHandler(ReportsController.purchaseReport)
);

router.get(
  '/sales',
  requirePermission(Permissions.REPORTS_READ),
  asyncHandler(ReportsController.salesReport)
);

export const reportsRoutes = router;
