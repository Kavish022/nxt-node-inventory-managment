import { Prisma, WarehouseStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { NotFoundError } from '../../utils/apiError';
import { buildPagination } from '../../utils/pagination';

export class WarehouseService {
  static async list(query: { page: number; limit: number; search?: string }) {
    const where: Prisma.WarehouseWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [{ name: { contains: query.search } }, { code: { contains: query.search } }],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        include: { manager: { select: { id: true, name: true, email: true } }, _count: { select: { stocks: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.warehouse.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async getById(id: number) {
    const warehouse = await prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        stocks: { include: { product: true } },
      },
    });
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }
    return warehouse;
  }

  static async create(input: {
    code: string;
    name: string;
    address?: string;
    city?: string;
    country?: string;
    managerId?: number;
    status?: WarehouseStatus;
  }) {
    return prisma.warehouse.create({ data: input });
  }

  static async update(id: number, input: Partial<{
    code: string;
    name: string;
    address: string;
    city: string;
    country: string;
    managerId: number | null;
    status: WarehouseStatus;
  }>) {
    await WarehouseService.getById(id);
    return prisma.warehouse.update({ where: { id }, data: input });
  }

  static async archive(id: number) {
    await WarehouseService.getById(id);
    return prisma.warehouse.update({
      where: { id },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });
  }
}
