import { SalesOrderStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, paginationQuerySchema, positiveDecimalSchema } from '../../validators/common';
import { SalesOrderService } from './sales-order.service';

const itemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: positiveDecimalSchema,
  unitPrice: positiveDecimalSchema,
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

const qtyItemsSchema = z.object({
  notes: z.string().optional(),
  reason: z.string().optional(),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: positiveDecimalSchema,
  })).min(1),
});

const listSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(SalesOrderStatus).optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.SALES_ORDERS_READ), validate({ query: listSchema }), asyncHandler(async (req, res) => {
  ApiResponse.paginated(res, await SalesOrderService.list(req.query as unknown as z.infer<typeof listSchema>));
}));

router.get('/:id', requirePermission(Permissions.SALES_ORDERS_READ), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await SalesOrderService.getById(Number(req.params.id)) });
}));

router.post('/', requirePermission(Permissions.SALES_ORDERS_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await SalesOrderService.create({ ...req.body, createdById: req.user!.id }), 'Sales order created');
}));

router.post('/:id/confirm', requirePermission(Permissions.SALES_ORDERS_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await SalesOrderService.confirm(Number(req.params.id)) });
}));

router.post('/:id/reserve', requirePermission(Permissions.SALES_ORDERS_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await SalesOrderService.reserve(Number(req.params.id)) });
}));

router.post('/:id/fulfill', requirePermission(Permissions.SALES_ORDERS_FULFILL), validate({ params: idParamSchema, body: qtyItemsSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, {
    message: 'Sales order fulfilled',
    data: await SalesOrderService.fulfill(Number(req.params.id), { ...req.body, createdById: req.user!.id }),
  });
}));

router.post('/:id/return', requirePermission(Permissions.SALES_ORDERS_FULFILL), validate({ params: idParamSchema, body: qtyItemsSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, {
    message: 'Sales return processed',
    data: await SalesOrderService.returnItems(Number(req.params.id), { ...req.body, createdById: req.user!.id }),
  });
}));

export const salesOrderRoutes = router;
