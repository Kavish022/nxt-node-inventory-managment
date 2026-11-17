import { prisma } from '../../config/db';
import { Prisma } from '@prisma/client';

export class DashboardService {
  static async getOverview(warehouseId?: number) {
    const stockWhere: Prisma.WarehouseStockWhereInput = warehouseId
      ? { warehouseId }
      : {};

    const [
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalCustomers,
      totalPurchaseOrders,
      totalSalesOrders,
      stocks,
      productsWithStock,
    ] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.supplier.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.purchaseOrder.count(),
      prisma.salesOrder.count(),
      prisma.warehouseStock.findMany({
        where: stockWhere,
        include: {
          product: {
            select: {
              costPrice: true,
              sellingPrice: true,
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          minStockLevel: true,
          stocks: {
            where: stockWhere,
            select: { quantity: true },
          },
        },
      }),
    ]);

    let totalStockQuantity = new Prisma.Decimal(0);
    let totalInventoryValue = new Prisma.Decimal(0);

    for (const s of stocks) {
      totalStockQuantity = totalStockQuantity.plus(s.quantity);
      totalInventoryValue = totalInventoryValue.plus(s.quantity.mul(s.product.costPrice));
    }

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of productsWithStock) {
      const currentQty = p.stocks.reduce(
        (sum, item) => sum.plus(item.quantity),
        new Prisma.Decimal(0)
      );

      if (currentQty.lte(0)) {
        outOfStockCount++;
      } else if (currentQty.lte(p.minStockLevel)) {
        lowStockCount++;
      }
    }

    return {
      totalProducts,
      totalCategories,
      totalStockQuantity: Number(totalStockQuantity.toFixed(2)),
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      totalSuppliers,
      totalCustomers,
      totalPurchaseOrders,
      totalSalesOrders,
    };
  }

  static async getAnalytics(warehouseId?: number) {
    // 1. Category-wise inventory distribution
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        products: {
          where: { deletedAt: null },
          select: {
            stocks: warehouseId
              ? { where: { warehouseId }, select: { quantity: true } }
              : { select: { quantity: true } },
          },
        },
      },
    });

    const categoryDistribution = categories.map((cat) => {
      let totalQty = new Prisma.Decimal(0);
      for (const prod of cat.products) {
        for (const st of prod.stocks) {
          totalQty = totalQty.plus(st.quantity);
        }
      }
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalQuantity: Number(totalQty.toFixed(2)),
      };
    }).filter((c) => c.totalQuantity > 0);

    // 2. Warehouse-wise inventory distribution
    const warehouses = await prisma.warehouse.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        stocks: {
          select: {
            quantity: true,
            product: { select: { costPrice: true } },
          },
        },
      },
    });

    const warehouseDistribution = warehouses.map((w) => {
      let totalQty = new Prisma.Decimal(0);
      let totalVal = new Prisma.Decimal(0);
      for (const st of w.stocks) {
        totalQty = totalQty.plus(st.quantity);
        totalVal = totalVal.plus(st.quantity.mul(st.product.costPrice));
      }
      return {
        warehouseId: w.id,
        code: w.code,
        name: w.name,
        totalQuantity: Number(totalQty.toFixed(2)),
        totalValue: Number(totalVal.toFixed(2)),
      };
    });

    // 3. Low stock alert items
    const lowStockProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        minStockLevel: true,
        reorderQuantity: true,
        stocks: {
          select: {
            quantity: true,
            warehouse: { select: { name: true } },
          },
        },
      },
    });

    const lowStockAlerts = lowStockProducts
      .map((p) => {
        const totalQty = p.stocks.reduce(
          (sum, s) => sum.plus(s.quantity),
          new Prisma.Decimal(0)
        );
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: Number(totalQty.toFixed(2)),
          minStockLevel: Number(p.minStockLevel),
          reorderQuantity: Number(p.reorderQuantity),
        };
      })
      .filter((p) => p.currentStock <= p.minStockLevel)
      .slice(0, 10);

    // 4. Monthly Purchases vs Sales (past 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [purchaseOrders, salesOrders] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          status: { in: ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
        },
        select: { createdAt: true, total: true },
      }),
      prisma.salesOrder.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          status: { in: ['CONFIRMED', 'RESERVED', 'PARTIALLY_FULFILLED', 'FULFILLED'] },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

    const monthlyTrends: Record<string, { month: string; purchases: number; sales: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      monthlyTrends[key] = { month: monthLabel, purchases: 0, sales: 0 };
    }

    for (const po of purchaseOrders) {
      const key = `${po.createdAt.getFullYear()}-${String(po.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrends[key]) {
        monthlyTrends[key].purchases += Number(po.total);
      }
    }

    for (const so of salesOrders) {
      const key = `${so.createdAt.getFullYear()}-${String(so.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrends[key]) {
        monthlyTrends[key].sales += Number(so.total);
      }
    }

    return {
      categoryDistribution,
      warehouseDistribution,
      lowStockAlerts,
      monthlyTrends: Object.values(monthlyTrends),
    };
  }

  static async getRecentActivities() {
    const [movements, purchaseOrders, salesOrders] = await Promise.all([
      prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true, code: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
      }),
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
      }),
    ]);

    return {
      stockMovements: movements,
      purchaseOrders,
      salesOrders,
    };
  }
}
