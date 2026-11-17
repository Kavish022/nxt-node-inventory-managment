import { PartnerStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, paginationQuerySchema } from '../../validators/common';
import { CustomerService } from './customer.service';

const createSchema = z.object({
  name: z.string().min(2).max(180),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  status: z.nativeEnum(PartnerStatus).optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.CUSTOMERS_READ), validate({ query: paginationQuerySchema }), asyncHandler(async (req, res) => {
  ApiResponse.paginated(res, await CustomerService.list(req.query as unknown as z.infer<typeof paginationQuerySchema>));
}));

router.get('/:id', requirePermission(Permissions.CUSTOMERS_READ), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await CustomerService.getById(Number(req.params.id)) });
}));

router.post('/', requirePermission(Permissions.CUSTOMERS_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await CustomerService.create(req.body), 'Customer created successfully');
}));

router.patch('/:id', requirePermission(Permissions.CUSTOMERS_WRITE), validate({ params: idParamSchema, body: createSchema.partial() }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Customer updated successfully', data: await CustomerService.update(Number(req.params.id), req.body) });
}));

router.delete('/:id', requirePermission(Permissions.CUSTOMERS_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Customer archived successfully', data: await CustomerService.archive(Number(req.params.id)) });
}));

export const customerRoutes = router;
