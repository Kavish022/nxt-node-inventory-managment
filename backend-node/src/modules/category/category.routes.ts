import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { idParamSchema, paginationQuerySchema } from '../../validators/common';
import { CategoryService } from './category.service';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().optional(),
  parentId: z.coerce.number().int().positive().optional(),
});

const updateSchema = createSchema.partial().extend({
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(Permissions.CATEGORIES_READ), validate({ query: paginationQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof paginationQuerySchema>;
  ApiResponse.paginated(res, await CategoryService.list(query));
}));

router.get('/tree', requirePermission(Permissions.CATEGORIES_READ), asyncHandler(async (_req, res) => {
  ApiResponse.send(res, { data: await CategoryService.tree() });
}));

router.post('/', requirePermission(Permissions.CATEGORIES_WRITE), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  ApiResponse.created(res, await CategoryService.create(req.body), 'Category created successfully');
}));

router.patch('/:id', requirePermission(Permissions.CATEGORIES_WRITE), validate({ params: idParamSchema, body: updateSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Category updated successfully', data: await CategoryService.update(Number(req.params.id), req.body) });
}));

router.delete('/:id', requirePermission(Permissions.CATEGORIES_WRITE), validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  ApiResponse.send(res, { message: 'Category archived successfully', data: await CategoryService.remove(Number(req.params.id)) });
}));

export const categoryRoutes = router;
