import { Prisma, SalesOrderStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { Permissions } from '../../constants/permissions';
import { BadRequestError, NotFoundError, UnprocessableEntityError } from '../../utils/apiError';
import { buildDocumentNumber } from '../../utils/identifiers';
import { buildPagination } from '../../utils/pagination';
import { moneyLineTotal, toDecimal } from '../../utils/stockMath';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../notification/notification.service';
import { PurchaseOrderService } from '../purchase-order/purchase-order.service';

interface OrderItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
}

export class SalesOrderService {
  static async list(query: { page: number; limit: number; search?: string; status?: SalesOrderStatus }) {
    const where: Prisma.SalesOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search } },
              { customer: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: { customer: true, warehouse: true, items: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return buildPagination(items, query.page, query.limit, totalItems);
  }

  static async getById(id: number) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        warehouse: true,
        items: { include: { product: true } },
        fulfillments: { include: { items: true } },
        returns: { include: { items: true } },
      },
    });
    if (!order) {
      throw new NotFoundError('Sales order not found');
    }
    return order;
  }

  static async create(input: {
    customerId: number;
    warehouseId: number;
    notes?: string;
    items: OrderItemInput[];
    createdById: number;
  }) {
    if (input.items.length === 0) {
      throw new BadRequestError('A sales order requires at least one item');
    }

    const totals = PurchaseOrderService.totals(input.items);

    return prisma.salesOrder.create({
      data: {
        orderNumber: buildDocumentNumber('SO'),
        customerId: input.customerId,
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
      include: { items: true, customer: true, warehouse: true },
    });
  }

  static async confirm(id: number) {
    const order = await SalesOrderService.getById(id);
    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityError('Only draft sales orders can be confirmed');
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    await NotificationService.notifyUsersWithPermission(Permissions.SALES_ORDERS_READ, {
      eventType: 'SALES_ORDER_UPDATE',
      title: 'Sales order confirmed',
      message: `${order.orderNumber} was confirmed.`,
      payload: { salesOrderId: id },
    });

    return updated;
  }

  static async reserve(id: number) {
    const order = await SalesOrderService.getById(id);
    if (!['CONFIRMED', 'RESERVED'].includes(order.status)) {
      throw new UnprocessableEntityError('Only confirmed sales orders can reserve stock');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const remaining = item.quantity.minus(item.reservedQty);
        if (remaining.lessThanOrEqualTo(0)) {
          continue;
        }

        await InventoryService.applyMovement(
          {
            type: 'RESERVATION',
            productId: item.productId,
            warehouseId: order.warehouseId,
            quantityDelta: 0,
            reservedDelta: remaining,
            referenceType: 'SALES_ORDER',
            referenceId: order.id,
          },
          tx
        );

        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: { reservedQty: item.quantity },
        });
      }

      await tx.salesOrder.update({
        where: { id },
        data: { status: 'RESERVED' },
      });
    });

    return SalesOrderService.getById(id);
  }

  static async fulfill(
    id: number,
    input: { items: Array<{ productId: number; quantity: number }>; notes?: string; createdById: number }
  ) {
    const order = await SalesOrderService.getById(id);
    if (!['CONFIRMED', 'RESERVED', 'PARTIALLY_FULFILLED'].includes(order.status)) {
      throw new UnprocessableEntityError('This sales order cannot be fulfilled in its current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const fulfillment = await tx.salesFulfillment.create({
        data: {
          fulfillmentNo: buildDocumentNumber('FUL'),
          salesOrderId: id,
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
      });

      for (const outgoing of input.items) {
        const line = order.items.find((item) => item.productId === outgoing.productId);
        if (!line) {
          throw new BadRequestError(`Product ${outgoing.productId} is not on this sales order`);
        }

        const remaining = line.quantity.minus(line.fulfilledQty);
        if (toDecimal(outgoing.quantity).greaterThan(remaining)) {
          throw new UnprocessableEntityError('Cannot fulfill more than the ordered quantity');
        }

        const reservedRelease = Prisma.Decimal.min(line.reservedQty, toDecimal(outgoing.quantity));

        await InventoryService.applyMovement(
          {
            type: 'SALE_FULFILLMENT',
            productId: outgoing.productId,
            warehouseId: order.warehouseId,
            quantityDelta: -Math.abs(outgoing.quantity),
            reservedDelta: reservedRelease.negated(),
            referenceType: 'SALES_FULFILLMENT',
            referenceId: fulfillment.id,
            createdById: input.createdById,
          },
          tx
        );

        await tx.salesOrderItem.update({
          where: { id: line.id },
          data: {
            fulfilledQty: line.fulfilledQty.plus(outgoing.quantity),
            reservedQty: line.reservedQty.minus(reservedRelease),
          },
        });
      }

      const refreshed = await tx.salesOrderItem.findMany({ where: { salesOrderId: id } });
      const fullyFulfilled = refreshed.every((item) => item.fulfilledQty.greaterThanOrEqualTo(item.quantity));

      await tx.salesOrder.update({
        where: { id },
        data: { status: fullyFulfilled ? 'FULFILLED' : 'PARTIALLY_FULFILLED' },
      });

      return fulfillment;
    });

    await NotificationService.notifyUsersWithPermission(Permissions.SALES_ORDERS_READ, {
      eventType: 'SALES_ORDER_UPDATE',
      title: 'Sales order fulfilled',
      message: `Fulfillment posted for ${order.orderNumber}.`,
      payload: { salesOrderId: id },
    });

    for (const item of input.items) {
      await InventoryService.raiseStockAlerts(item.productId);
    }

    return result;
  }

  static async returnItems(
    id: number,
    input: { items: Array<{ productId: number; quantity: number }>; reason?: string; createdById: number }
  ) {
    const order = await SalesOrderService.getById(id);
    if (!['FULFILLED', 'PARTIALLY_FULFILLED', 'RETURNED'].includes(order.status)) {
      throw new UnprocessableEntityError('Only fulfilled sales orders can accept returns');
    }

    const salesReturn = await prisma.$transaction(async (tx) => {
      const created = await tx.salesReturn.create({
        data: {
          returnNumber: buildDocumentNumber('RET'),
          salesOrderId: id,
          reason: input.reason,
          createdById: input.createdById,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: toDecimal(item.quantity),
            })),
          },
        },
      });

      for (const incoming of input.items) {
        await InventoryService.applyMovement(
          {
            type: 'SALE_RETURN',
            productId: incoming.productId,
            warehouseId: order.warehouseId,
            quantityDelta: Math.abs(incoming.quantity),
            referenceType: 'SALES_RETURN',
            referenceId: created.id,
            createdById: input.createdById,
          },
          tx
        );
      }

      await tx.salesOrder.update({
        where: { id },
        data: { status: 'RETURNED' },
      });

      return created;
    });

    return salesReturn;
  }
}
