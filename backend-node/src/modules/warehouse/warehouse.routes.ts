import { WarehouseStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, paginationQuerySchema } from '../../validators/common';
import { WarehouseService } from './warehouse.service';

const createSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(160),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  managerId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(WarehouseStatus).optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.WAREHOUSES_READ), validate({ query: paginationQuerySchema }), asyncHandler(async (req, res) => {
  ApiResponse.paginated(res, await WarehouseService.list(req.query as unknown as z.infer<typeof paginationQuerySchema>));
}));

router.get('/:id', requirePermission(Permissions.WAREHOUSES_READ), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await WarehouseService.getById(Number(req.params.id)) });
}));

router.post('/', requirePermission(Permissions.WAREHOUSES_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await WarehouseService.create(req.body), 'Warehouse created successfully');
}));

router.patch('/:id', requirePermission(Permissions.WAREHOUSES_WRITE), validate({ params: idParamSchema, body: createSchema.partial() }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Warehouse updated successfully', data: await WarehouseService.update(Number(req.params.id), req.body) });
}));

router.delete('/:id', requirePermission(Permissions.WAREHOUSES_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Warehouse archived successfully', data: await WarehouseService.archive(Number(req.params.id)) });
}));

export const warehouseRoutes = router;
