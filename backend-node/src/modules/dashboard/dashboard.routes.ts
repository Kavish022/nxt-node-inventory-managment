import { Router } from 'express';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { DashboardController } from './dashboard.controller';

const router = Router();
router.use(authenticate);

router.get(
  '/overview',
  requirePermission(Permissions.DASHBOARD_READ),
  asyncHandler(DashboardController.overview)
);

router.get(
  '/analytics',
  requirePermission(Permissions.DASHBOARD_READ),
  asyncHandler(DashboardController.analytics)
);

router.get(
  '/recent-activities',
  requirePermission(Permissions.DASHBOARD_READ),
  asyncHandler(DashboardController.recentActivities)
);

export const dashboardRoutes = router;
