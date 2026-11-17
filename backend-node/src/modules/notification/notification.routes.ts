import { Router } from 'express';
import { z } from 'zod';
import { Permissions } from '../../constants/permissions';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { paginationQuerySchema, idParamSchema } from '../../validators/common';
import { NotificationService } from './notification.service';
import { ApiResponse } from '../../utils/apiResponse';

const listSchema = paginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});

const router = Router();

router.use(authenticate, requirePermission(Permissions.NOTIFICATIONS_READ));

router.get(
  '/',
  validate({ query: listSchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listSchema>;
    const result = await NotificationService.list(req.user!.id, query.page, query.limit, query.unreadOnly);
    ApiResponse.paginated(res, result);
  })
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await NotificationService.markAllRead(req.user!.id);
    ApiResponse.send(res, { message: 'All notifications marked as read', data: null });
  })
);

router.patch(
  '/:id/read',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await NotificationService.markRead(req.user!.id, Number(req.params.id));
    ApiResponse.send(res, { message: 'Notification marked as read', data: null });
  })
);

export const notificationRoutes = router;
