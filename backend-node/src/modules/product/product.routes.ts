import { ProductStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, nonNegativeDecimalSchema, paginationQuerySchema } from '../../validators/common';
import { ProductService } from './product.service';

const imageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
});

const createSchema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().max(64).optional(),
  name: z.string().min(2).max(180),
  description: z.string().optional(),
  categoryId: z.coerce.number().int().positive(),
  brand: z.string().max(120).optional(),
  unitOfMeasure: z.string().max(32).optional(),
  costPrice: nonNegativeDecimalSchema,
  sellingPrice: nonNegativeDecimalSchema,
  minStockLevel: nonNegativeDecimalSchema.optional(),
  maxStockLevel: nonNegativeDecimalSchema.optional(),
  reorderQuantity: nonNegativeDecimalSchema.optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  images: z.array(imageSchema).optional(),
});

const listSchema = paginationQuerySchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.PRODUCTS_READ), validate({ query: listSchema }), asyncHandler(async (req, res) => {
  ApiResponse.paginated(res, await ProductService.list(req.query as unknown as z.infer<typeof listSchema>));
}));

router.get('/:id', requirePermission(Permissions.PRODUCTS_READ), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: await ProductService.getById(Number(req.params.id)) });
}));

router.post('/', requirePermission(Permissions.PRODUCTS_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await ProductService.create({ ...req.body, createdById: req.user!.id }), 'Product created successfully');
}));

router.patch('/:id', requirePermission(Permissions.PRODUCTS_WRITE), validate({ params: idParamSchema, body: createSchema.partial() }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Product updated successfully', data: await ProductService.update(Number(req.params.id), req.body) });
}));

router.delete('/:id', requirePermission(Permissions.PRODUCTS_DELETE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Product archived successfully', data: await ProductService.archive(Number(req.params.id)) });
}));

export const productRoutes = router;
