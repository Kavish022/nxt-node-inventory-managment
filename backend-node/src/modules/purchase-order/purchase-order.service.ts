import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { Permissions } from '../../constants/permissions';
import { BadRequestError, NotFoundError, UnprocessableEntityError } from '../../utils/apiError';
import { buildDocumentNumber } from '../../utils/identifiers';
import { buildPagination } from '../../utils/pagination';
import { moneyLineTotal, toDecimal } from '../../utils/stockMath';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../notification/notification.service';

interface OrderItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
}

export class PurchaseOrderService {
  static async list(query: { page: number; limit: number; search?: string; status?: PurchaseOrderStatus }) {
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search } },
              { supplier: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true, warehouse: true, items: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async getById(id: number) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } },
        receipts: { include: { items: true } },
      },
    });
    if (!order) {
      throw new NotFoundError('Purchase order not found');
    }
    return order;
  }

  static totals(items: OrderItemInput[]) {
    return items.reduce(
      (acc, item) => {
        const line = moneyLineTotal(item.quantity, item.unitPrice, item.taxRate ?? 0, item.discountAmount ?? 0);
        return {
          subtotal: acc.subtotal.plus(line.subtotal),
          taxAmount: acc.taxAmount.plus(line.taxAmount),
          discountAmount: acc.discountAmount.plus(item.discountAmount ?? 0),
          total: acc.total.plus(line.lineTotal),
        };
      },
      {
        subtotal: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        discountAmount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
      }
    );
  }

  static async create(input: {
    supplierId: number;
    warehouseId: number;
    notes?: string;
    items: OrderItemInput[];
    createdById: number;
  }) {
    if (input.items.length === 0) {
      throw new BadRequestError('A purchase order requires at least one item');
    }

    const totals = PurchaseOrderService.totals(input.items);

    return prisma.purchaseOrder.create({
      data: {
        orderNumber: buildDocumentNumber('PO'),
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        notes: input.notes,
        createdById: input.createdById,
        ...totals,
        items: {
          create: input.items.map((item) => {
            const line = moneyLineTotal(item.quantity, item.unitPrice, item.taxRate ?? 0, item.discountAmount ?? 0);
            return {
              productId: item.productId,
              quantity: toDecimal(item.quantity),
              unitPrice: toDecimal(item.unitPrice),
              taxRate: toDecimal(item.taxRate ?? 0),
              discountAmount: toDecimal(item.discountAmount ?? 0),
              lineTotal: line.lineTotal,
            };
          }),
        },
      },
      include: { items: true, supplier: true, warehouse: true },
    });
  }

  static async submit(id: number) {
    const order = await PurchaseOrderService.getById(id);
    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityError('Only draft purchase orders can be submitted');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await NotificationService.notifyUsersWithPermission(Permissions.PURCHASE_ORDERS_APPROVE, {
      eventType: 'PURCHASE_ORDER_APPROVAL',
      title: 'Purchase order awaiting approval',
      message: `${order.orderNumber} is pending approval.`,
      payload: { purchaseOrderId: id },
    });

    return updated;
  }

  static async approve(id: number) {
    const order = await PurchaseOrderService.getById(id);
    if (order.status !== 'PENDING_APPROVAL') {
      throw new UnprocessableEntityError('Only pending purchase orders can be approved');
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  static async cancel(id: number) {
    const order = await PurchaseOrderService.getById(id);
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      throw new UnprocessableEntityError('This purchase order cannot be cancelled');
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  static async receive(
    id: number,
    input: { items: Array<{ productId: number; quantity: number }>; notes?: string; createdById: number }
  ) {
    const order = await PurchaseOrderService.getById(id);
    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new UnprocessableEntityError('Goods can only be received against approved purchase orders');
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber: buildDocumentNumber('GRN'),
          purchaseOrderId: id,
          warehouseId: order.warehouseId,
          notes: input.notes,
          createdById: input.createdById,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: toDecimal(item.quantity),
            })),
          },
        },
        include: { items: true },
      });

      for (const incoming of input.items) {
        const line = order.items.find((item) => item.productId === incoming.productId);
        if (!line) {
          throw new BadRequestError(`Product ${incoming.productId} is not on this purchase order`);
        }

        const remaining = line.quantity.minus(line.receivedQty);
        if (toDecimal(incoming.quantity).greaterThan(remaining)) {
          throw new UnprocessableEntityError(`Cannot receive more than outstanding quantity for product ${line.product.name}`);
        }

        await tx.purchaseOrderItem.update({
          where: { id: line.id },
          data: { receivedQty: line.receivedQty.plus(incoming.quantity) },
        });

        await InventoryService.applyMovement(
          {
            type: 'PURCHASE_RECEIPT',
            productId: incoming.productId,
            warehouseId: order.warehouseId,
            quantityDelta: incoming.quantity,
            unitCost: line.unitPrice,
            referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id,
            createdById: input.createdById,
          },
          tx
        );
      }

      const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const fullyReceived = refreshed.every((item) => item.receivedQty.greaterThanOrEqualTo(item.quantity));

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
      });

      return receipt;
    });

    await NotificationService.notifyUsersWithPermission(Permissions.PURCHASE_ORDERS_READ, {
      eventType: 'PURCHASE_ORDER_RECEIVED',
      title: 'Purchase order goods received',
      message: `Goods were received for ${order.orderNumber}.`,
      payload: { purchaseOrderId: id },
    });

    for (const item of input.items) {
      await InventoryService.raiseStockAlerts(item.productId);
    }

    return result;
  }
}
