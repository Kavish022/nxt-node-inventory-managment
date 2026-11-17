import { prisma } from '../../config/db';
import { Prisma } from '@prisma/client';
import { buildPagination } from '../../utils/pagination';

export class ReportsService {
  static async getStockValuationReport(query: { warehouseId?: number }) {
    const where: Prisma.WarehouseStockWhereInput = query.warehouseId
      ? { warehouseId: query.warehouseId }
      : {};

    const stocks = await prisma.warehouseStock.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            costPrice: true,
            sellingPrice: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    let totalValuationCost = new Prisma.Decimal(0);
    let totalValuationRetail = new Prisma.Decimal(0);
    let totalQuantity = new Prisma.Decimal(0);

    const rows = stocks.map((s) => {
      const lineCostVal = s.quantity.mul(s.product.costPrice);
      const lineRetailVal = s.quantity.mul(s.product.sellingPrice);
      totalQuantity = totalQuantity.plus(s.quantity);
      totalValuationCost = totalValuationCost.plus(lineCostVal);
      totalValuationRetail = totalValuationRetail.plus(lineRetailVal);

      return {
        stockId: s.id,
        warehouseCode: s.warehouse.code,
        warehouseName: s.warehouse.name,
        sku: s.product.sku,
        productName: s.product.name,
        category: s.product.category?.name ?? 'Uncategorized',
        quantity: Number(s.quantity),
        reservedQuantity: Number(s.reservedQuantity),
        availableQuantity: Number(s.quantity.minus(s.reservedQuantity)),
        costPrice: Number(s.product.costPrice),
        sellingPrice: Number(s.product.sellingPrice),
        valuationAtCost: Number(lineCostVal.toFixed(2)),
        valuationAtRetail: Number(lineRetailVal.toFixed(2)),
      };
    });

    return {
      summary: {
        totalItems: rows.length,
        totalQuantity: Number(totalQuantity.toFixed(2)),
        totalValuationAtCost: Number(totalValuationCost.toFixed(2)),
        totalValuationAtRetail: Number(totalValuationRetail.toFixed(2)),
      },
      items: rows,
    };
  }

  static async getLowStockReport(query: { warehouseId?: number; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: { select: { name: true } },
        stocks: query.warehouseId
          ? { where: { warehouseId: query.warehouseId }, include: { warehouse: true } }
          : { include: { warehouse: true } },
      },
    });

    const lowStockItems = products
      .map((p) => {
        const totalQty = p.stocks.reduce((acc, s) => acc.plus(s.quantity), new Prisma.Decimal(0));
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category.name,
          currentStock: Number(totalQty.toFixed(2)),
          minStockLevel: Number(p.minStockLevel),
          reorderQuantity: Number(p.reorderQuantity),
          deficit: Number(p.minStockLevel.minus(totalQty).toFixed(2)),
        };
      })
      .filter((item) => item.currentStock <= item.minStockLevel);

    const totalItems = lowStockItems.length;
    const paginated = lowStockItems.slice((page - 1) * limit, page * limit);

    return buildPagination(paginated, page, limit, totalItems);
  }

  static async getStockMovementsReport(query: {
    page?: number;
    limit?: number;
    productId?: number;
    warehouseId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return buildPagination(items, page, limit, totalItems);
  }

  static async getPurchaseReport(query: {
    startDate?: string;
    endDate?: string;
    supplierId?: number;
  }) {
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSpend = new Prisma.Decimal(0);
    orders.forEach((o) => {
      totalSpend = totalSpend.plus(o.total);
    });

    return {
      summary: {
        totalOrders: orders.length,
        totalSpend: Number(totalSpend.toFixed(2)),
      },
      orders,
    };
  }

  static async getSalesReport(query: {
    startDate?: string;
    endDate?: string;
    customerId?: number;
  }) {
    const where: Prisma.SalesOrderWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const orders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        warehouse: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalRevenue = new Prisma.Decimal(0);
    orders.forEach((o) => {
      totalRevenue = totalRevenue.plus(o.total);
    });

    return {
      summary: {
        totalOrders: orders.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
      orders,
    };
  }
}
