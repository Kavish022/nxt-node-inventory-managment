import { Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '../../config/db';
import { Permissions } from '../../constants/permissions';
import { NotFoundError, UnprocessableEntityError } from '../../utils/apiError';
import { buildPagination } from '../../utils/pagination';
import { applyStockDelta, toDecimal } from '../../utils/stockMath';
import { NotificationService } from '../notification/notification.service';
import { broadcastStockUpdate } from '../../socket';

type Tx = Prisma.TransactionClient;

interface MovementInput {
  type: StockMovementType;
  productId: number;
  warehouseId: number;
  quantityDelta: Prisma.Decimal | number | string;
  unitCost?: Prisma.Decimal | number | string;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  createdById?: number;
  reservedDelta?: Prisma.Decimal | number | string;
}

export class InventoryService {
  static async getSettings() {
    const existing = await prisma.inventorySetting.findFirst();
    if (existing) {
      return existing;
    }

    return prisma.inventorySetting.create({
      data: { allowNegativeStock: false },
    });
  }

  static async updateSettings(allowNegativeStock: boolean) {
    const current = await InventoryService.getSettings();
    return prisma.inventorySetting.update({
      where: { id: current.id },
      data: { allowNegativeStock },
    });
  }

  static async applyMovement(input: MovementInput, client: Tx | typeof prisma = prisma) {
    const settings = await client.inventorySetting.findFirst();
    const allowNegativeStock = settings?.allowNegativeStock ?? false;
    const delta = toDecimal(input.quantityDelta);
    const reservedDelta = toDecimal(input.reservedDelta ?? 0);

    const stock = await client.warehouseStock.findUnique({
      where: {
        uq_warehouse_product_stock: {
          warehouseId: input.warehouseId,
          productId: input.productId,
        },
      },
    });

    const currentQty = stock?.quantity ?? new Prisma.Decimal(0);
    const currentReserved = stock?.reservedQuantity ?? new Prisma.Decimal(0);

    let nextQty: Prisma.Decimal;
    try {
      nextQty = applyStockDelta(currentQty, delta, allowNegativeStock);
    } catch {
      throw new UnprocessableEntityError('Insufficient stock for this operation');
    }

    const nextReserved = currentReserved.plus(reservedDelta);
    if (nextReserved.lessThan(0) || nextReserved.greaterThan(nextQty)) {
      throw new UnprocessableEntityError('Reserved quantity is invalid for the available stock');
    }

    const upserted = await client.warehouseStock.upsert({
      where: {
        uq_warehouse_product_stock: {
          warehouseId: input.warehouseId,
          productId: input.productId,
        },
      },
      update: {
        quantity: nextQty,
        reservedQuantity: nextReserved,
      },
      create: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        quantity: nextQty,
        reservedQuantity: nextReserved,
      },
    });

    const movement = await client.stockMovement.create({
      data: {
        type: input.type,
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: delta,
        resultingQuantity: nextQty,
        unitCost: input.unitCost ? toDecimal(input.unitCost) : undefined,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        notes: input.notes,
        createdById: input.createdById,
      },
    });

    broadcastStockUpdate({
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: upserted.quantity.toString(),
      type: input.type,
    });

    return { stock: upserted, movement };
  }

  static async adjust(input: {
    productId: number;
    warehouseId: number;
    quantity: number;
    type: Extract<StockMovementType, 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'OPENING' | 'RECONCILIATION'>;
    notes?: string;
    createdById: number;
  }) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, deletedAt: null } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, deletedAt: null } });
    if (!warehouse) {
      throw new NotFoundError('Warehouse not found');
    }

    const signedQuantity =
      input.type === 'STOCK_OUT' ? -Math.abs(input.quantity) : Math.abs(input.quantity);

    const result = await prisma.$transaction(async (tx) => {
      if (input.type === 'ADJUSTMENT' || input.type === 'RECONCILIATION') {
        const current = await tx.warehouseStock.findUnique({
          where: {
            uq_warehouse_product_stock: {
              warehouseId: input.warehouseId,
              productId: input.productId,
            },
          },
        });
        const currentQty = current?.quantity ?? new Prisma.Decimal(0);
        const delta = toDecimal(input.quantity).minus(currentQty);
        return InventoryService.applyMovement(
          {
            type: input.type,
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantityDelta: delta,
            notes: input.notes,
            createdById: input.createdById,
          },
          tx
        );
      }

      // return InventoryService.applyMovement(
      //   {
      //     type: input.type,
      //     productId: input.productId,
      //     warehouseId: input.warehouseId,
      //     quantityDelta: signedQuantity,
      //     notes: input.notes,
      //     createdById: input.createdById,
      //   },
      //   tx
      // );
    });

    await InventoryService.raiseStockAlerts(input.productId);
    return result;
  }

  static async transfer(input: {
    productId: number;
    fromWarehouseId: number;
    toWarehouseId: number;
    quantity: number;
    notes?: string;
    createdById: number;
  }) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new UnprocessableEntityError('Source and destination warehouses must be different');
    }

    const result = await prisma.$transaction(async (tx) => {
      const outgoing = await InventoryService.applyMovement(
        {
          type: 'TRANSFER_OUT',
          productId: input.productId,
          warehouseId: input.fromWarehouseId,
          quantityDelta: -Math.abs(input.quantity),
          notes: input.notes,
          createdById: input.createdById,
          referenceType: 'WAREHOUSE_TRANSFER',
        },
        tx
      );

      const incoming = await InventoryService.applyMovement(
        {
          type: 'TRANSFER_IN',
          productId: input.productId,
          warehouseId: input.toWarehouseId,
          quantityDelta: Math.abs(input.quantity),
          notes: input.notes,
          createdById: input.createdById,
          referenceType: 'WAREHOUSE_TRANSFER',
          referenceId: outgoing.movement.id,
        },
        tx
      );

      await tx.stockMovement.update({
        where: { id: outgoing.movement.id },
        data: { referenceId: incoming.movement.id },
      });

      return { outgoing, incoming };
    });

    await NotificationService.notifyUsersWithPermission(Permissions.INVENTORY_READ, {
      eventType: 'WAREHOUSE_TRANSFER',
      title: 'Warehouse transfer completed',
      message: `Transferred ${input.quantity} units of product #${input.productId}`,
      payload: input,
    });

    return result;
  }

  static async listStock(query: {
    page: number;
    limit: number;
    search?: string;
    warehouseId?: number;
    categoryId?: number;
    lowStock?: boolean;
  }) {
    const where: Prisma.WarehouseStockWhereInput = {
      product: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { sku: { contains: query.search } },
                { barcode: { contains: query.search } },
              ],
            }
          : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      warehouse: { deletedAt: null },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.warehouseStock.findMany({
        where,
        include: {
          product: { include: { category: true } },
          warehouse: true,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.warehouseStock.count({ where }),
    ]);

    const filtered = query.lowStock
      ? items.filter((item) => item.quantity.lessThanOrEqualTo(item.product.minStockLevel))
      : items;

    return buildPagination(filtered, query.page, query.limit, query.lowStock ? filtered.length : totalItems);
  }

  static async listMovements(query: {
    page: number;
    limit: number;
    productId?: number;
    warehouseId?: number;
    type?: StockMovementType;
  }) {
    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async raiseStockAlerts(productId: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { stocks: true },
    });
    if (!product) {
      return;
    }

    const total = product.stocks.reduce((sum, stock) => sum.plus(stock.quantity), new Prisma.Decimal(0));

    if (total.lessThanOrEqualTo(0)) {
      await NotificationService.notifyUsersWithPermission(Permissions.INVENTORY_READ, {
        eventType: 'OUT_OF_STOCK',
        title: 'Product is out of stock',
        message: `${product.name} (${product.sku}) has reached zero quantity.`,
        payload: { productId },
      });
      return;
    }

    if (total.lessThanOrEqualTo(product.minStockLevel)) {
      await NotificationService.notifyUsersWithPermission(Permissions.INVENTORY_READ, {
        eventType: 'LOW_STOCK',
        title: 'Low stock alert',
        message: `${product.name} (${product.sku}) is at or below the minimum stock level.`,
        payload: { productId, quantity: total.toString() },
      });
    }
  }
}
