import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ConflictError, NotFoundError } from '../../utils/apiError';
import { slugify } from '../../utils/identifiers';
import { buildPagination } from '../../utils/pagination';

export class CategoryService {
  static async list(query: { page: number; limit: number; search?: string }) {
    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.category.findMany({
        where,
        include: { parent: true, _count: { select: { products: true, children: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.category.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async tree() {
    return prisma.category.findMany({
      where: { deletedAt: null, parentId: null },
      include: {
        children: {
          where: { deletedAt: null },
          include: { children: { where: { deletedAt: null } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async create(input: { name: string; description?: string; parentId?: number }) {
    if (input.parentId) {
      const parent = await prisma.category.findFirst({ where: { id: input.parentId, deletedAt: null } });
      if (!parent) {
        throw new NotFoundError('Parent category not found');
      }
    }

    const slug = slugify(input.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing && !existing.deletedAt) {
      throw new ConflictError('A category with this name already exists');
    }

    return prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        parentId: input.parentId,
      },
    });
  }

  static async update(id: number, input: { name?: string; description?: string; parentId?: number | null }) {
    const category = await prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (input.parentId === id) {
      throw new ConflictError('A category cannot be its own parent');
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { slug: slugify(input.name) } : {}),
      },
    });
  }

  static async remove(id: number) {
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    if (category._count.products > 0 || category._count.children > 0) {
      throw new ConflictError('Cannot delete a category that still has products or subcategories');
    }

    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
