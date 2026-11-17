import { Router } from 'express';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { InventoryController } from './inventory.controller';
import {
  adjustStockSchema,
  listMovementsQuerySchema,
  listStockQuerySchema,
  transferStockSchema,
  updateSettingsSchema,
} from './inventory.validation';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(Permissions.INVENTORY_READ), validate({ query: listStockQuerySchema }), asyncHandler(InventoryController.list));
router.get('/movements', requirePermission(Permissions.INVENTORY_READ), validate({ query: listMovementsQuerySchema }), asyncHandler(InventoryController.movements));
router.get('/settings', requirePermission(Permissions.INVENTORY_READ), asyncHandler(InventoryController.settings));
router.patch('/settings', requirePermission(Permissions.SETTINGS_WRITE), validate({ body: updateSettingsSchema }), asyncHandler(InventoryController.updateSettings));
router.post('/adjust', requirePermission(Permissions.INVENTORY_ADJUST), validate({ body: adjustStockSchema }), asyncHandler(InventoryController.adjust));
router.post('/transfer', requirePermission(Permissions.INVENTORY_TRANSFER), validate({ body: transferStockSchema }), asyncHandler(InventoryController.transfer));

export const inventoryRoutes = router;
