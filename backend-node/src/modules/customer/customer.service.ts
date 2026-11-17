import { PartnerStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { NotFoundError } from '../../utils/apiError';
import { buildPagination } from '../../utils/pagination';

export class CustomerService {
  static async list(query: { page: number; limit: number; search?: string }) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { salesOrders: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async getById(id: number) {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: { salesOrders: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }
    return customer;
  }

  static async create(input: {
    name: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    shippingAddress?: string;
    city?: string;
    country?: string;
  }) {
    return prisma.customer.create({ data: input });
  }

  static async update(id: number, input: Partial<{
    name: string;
    email: string;
    phone: string;
    billingAddress: string;
    shippingAddress: string;
    city: string;
    country: string;
    status: PartnerStatus;
  }>) {
    await CustomerService.getById(id);
    return prisma.customer.update({ where: { id }, data: input });
  }

  static async archive(id: number) {
    await CustomerService.getById(id);
    return prisma.customer.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }
}
