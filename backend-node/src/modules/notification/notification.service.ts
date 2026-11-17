import { NotificationEventType, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { PermissionKey } from '../../constants/permissions';
import { buildPagination } from '../../utils/pagination';

export class NotificationService {
  static async notifyUsersWithPermission(
    permission: PermissionKey,
    input: {
      eventType: NotificationEventType;
      title: string;
      message: string;
      payload?: Prisma.InputJsonValue;
    }
  ) {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        accountStatus: 'ACTIVE',
        role: {
          permissions: {
            some: { permission: { key: permission } },
          },
        },
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return;
    }

    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        eventType: input.eventType,
        title: input.title,
        message: input.message,
        payload: input.payload,
      })),
    });
  }

  static async list(userId: number, page: number, limit: number, unreadOnly?: boolean) {
    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return buildPagination(items, page, limit, totalItems);
  }

  static async markRead(userId: number, id: number) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  static async markAllRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
