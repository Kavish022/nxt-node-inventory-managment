import { PartnerStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, paginationQuerySchema } from '../../validators/common';
import { SupplierService } from './supplier.service';

const createSchema = z.object({
  name: z.string().min(2).max(180),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  productIds: z.array(z.coerce.number().int().positive()).optional(),
  status: z.nativeEnum(PartnerStatus).optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.SUPPLIERS_READ), validate({ query: paginationQuerySchema }), asyncHandler(async (req, res) => {
  ApiResponse.paginated(res, await SupplierService.list(req.query as unknown as z.infer<typeof paginationQuerySchema>));
}));

router.get('/:id', requirePermission(Permissions.SUPPLIERS_READ), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await SupplierService.getById(Number(req.params.id)) });
}));

router.post('/', requirePermission(Permissions.SUPPLIERS_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await SupplierService.create(req.body), 'Supplier created successfully');
}));

router.patch('/:id', requirePermission(Permissions.SUPPLIERS_WRITE), validate({ params: idParamSchema, body: createSchema.partial() }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Supplier updated successfully', data: await SupplierService.update(Number(req.params.id), req.body) });
}));

router.delete('/:id', requirePermission(Permissions.SUPPLIERS_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Supplier archived successfully', data: await SupplierService.archive(Number(req.params.id)) });
}));

export const supplierRoutes = router;
