import { Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { NotFoundError } from '../../utils/apiError';
import { buildPagination } from '../../utils/pagination';
import { toDecimal } from '../../utils/stockMath';

export class ProductService {
  static async list(query: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: number;
    status?: ProductStatus;
  }) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { sku: { contains: query.search } },
              { barcode: { contains: query.search } },
              { brand: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          stocks: { include: { warehouse: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async getById(id: number) {
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        stocks: { include: { warehouse: true } },
        supplierProducts: { include: { supplier: true } },
      },
    });
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  static async create(input: {
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    categoryId: number;
    brand?: string;
    unitOfMeasure?: string;
    costPrice: number;
    sellingPrice: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderQuantity?: number;
    status?: ProductStatus;
    images?: Array<{ url: string; altText?: string }>;
    createdById: number;
  }) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, deletedAt: null } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return prisma.product.create({
      data: {
        sku: input.sku.trim(),
        barcode: input.barcode?.trim() || null,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        brand: input.brand,
        unitOfMeasure: input.unitOfMeasure ?? 'pcs',
        costPrice: toDecimal(input.costPrice),
        sellingPrice: toDecimal(input.sellingPrice),
        minStockLevel: toDecimal(input.minStockLevel ?? 0),
        maxStockLevel: input.maxStockLevel !== undefined ? toDecimal(input.maxStockLevel) : null,
        reorderQuantity: toDecimal(input.reorderQuantity ?? 0),
        status: input.status ?? 'ACTIVE',
        createdById: input.createdById,
        images: input.images
          ? {
              create: input.images.map((image, index) => ({
                url: image.url,
                altText: image.altText,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { category: true, images: true },
    });
  }

  static async update(
    id: number,
    input: Partial<{
      sku: string;
      barcode: string | null;
      name: string;
      description: string;
      categoryId: number;
      brand: string;
      unitOfMeasure: string;
      costPrice: number;
      sellingPrice: number;
      minStockLevel: number;
      maxStockLevel: number | null;
      reorderQuantity: number;
      status: ProductStatus;
      images: Array<{ url: string; altText?: string }>;
    }>
  ) {
    await ProductService.getById(id);

    return prisma.$transaction(async (tx) => {
      if (input.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          sku: input.sku?.trim(),
          barcode: input.barcode === undefined ? undefined : input.barcode?.trim() || null,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          brand: input.brand,
          unitOfMeasure: input.unitOfMeasure,
          costPrice: input.costPrice !== undefined ? toDecimal(input.costPrice) : undefined,
          sellingPrice: input.sellingPrice !== undefined ? toDecimal(input.sellingPrice) : undefined,
          minStockLevel: input.minStockLevel !== undefined ? toDecimal(input.minStockLevel) : undefined,
          maxStockLevel:
            input.maxStockLevel === undefined
              ? undefined
              : input.maxStockLevel === null
                ? null
                : toDecimal(input.maxStockLevel),
          reorderQuantity: input.reorderQuantity !== undefined ? toDecimal(input.reorderQuantity) : undefined,
          status: input.status,
          images: input.images
            ? {
                create: input.images.map((image, index) => ({
                  url: image.url,
                  altText: image.altText,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: { category: true, images: true },
      });
    });
  }

  static async archive(id: number) {
    await ProductService.getById(id);
    return prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }
}
