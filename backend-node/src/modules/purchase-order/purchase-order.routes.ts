import { PurchaseOrderStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, paginationQuerySchema, positiveDecimalSchema } from '../../validators/common';
import { PurchaseOrderService } from './purchase-order.service';

const itemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: positiveDecimalSchema,
  unitPrice: positiveDecimalSchema,
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

const receiveSchema = z.object({
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: positiveDecimalSchema,
  })).min(1),
});

const listSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.PURCHASE_ORDERS_READ), validate({ query: listSchema }), asyncHandler(async (req, res) => {
  ApiResponse.paginated(res, await PurchaseOrderService.list(req.query as unknown as z.infer<typeof listSchema>));
}));

router.get('/:id', requirePermission(Permissions.PURCHASE_ORDERS_READ), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await PurchaseOrderService.getById(Number(req.params.id)) });
}));

router.post('/', requirePermission(Permissions.PURCHASE_ORDERS_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await PurchaseOrderService.create({ ...req.body, createdById: req.user!.id }), 'Purchase order created');
}));

router.post('/:id/submit', requirePermission(Permissions.PURCHASE_ORDERS_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await PurchaseOrderService.submit(Number(req.params.id)) });
}));

router.post('/:id/approve', requirePermission(Permissions.PURCHASE_ORDERS_APPROVE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await PurchaseOrderService.approve(Number(req.params.id)) });
}));

router.post('/:id/cancel', requirePermission(Permissions.PURCHASE_ORDERS_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await PurchaseOrderService.cancel(Number(req.params.id)) });
}));

router.post('/:id/receive', requirePermission(Permissions.PURCHASE_ORDERS_RECEIVE), validate({ params: idParamSchema, body: receiveSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, {
    message: 'Goods received successfully',
    data: await PurchaseOrderService.receive(Number(req.params.id), { ...req.body, createdById: req.user!.id }),
  });
}));

export const purchaseOrderRoutes = router;
