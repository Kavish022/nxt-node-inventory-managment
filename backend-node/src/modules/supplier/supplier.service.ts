import { PartnerStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { NotFoundError } from '../../utils/apiError';
import { buildPagination } from '../../utils/pagination';

export class SupplierService {
  static async list(query: { page: number; limit: number; search?: string }) {
    const where: Prisma.SupplierWhereInput = {
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
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchaseOrders: true, products: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async getById(id: number) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        products: { include: { product: true } },
        purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }
    return supplier;
  }

  static async create(input: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    taxId?: string;
    productIds?: number[];
  }) {
    return prisma.supplier.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        country: input.country,
        taxId: input.taxId,
        products: input.productIds
          ? { create: input.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
    });
  }

  static async update(id: number, input: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    taxId: string;
    status: PartnerStatus;
    productIds: number[];
  }>) {
    await SupplierService.getById(id);

    return prisma.$transaction(async (tx) => {
      if (input.productIds) {
        await tx.supplierProduct.deleteMany({ where: { supplierId: id } });
        await tx.supplierProduct.createMany({
          data: input.productIds.map((productId) => ({ supplierId: id, productId })),
        });
      }

      const { productIds: _productIds, ...data } = input;
      return tx.supplier.update({ where: { id }, data });
    });
  }

  static async archive(id: number) {
    await SupplierService.getById(id);
    return prisma.supplier.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }
}
