import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { InventoryReferenceType } from '../inventory/inventory.enums';
import { SaleTicketStatus } from '../sales/sales.enums';
import { InventoryMovementsReportQueryDto } from './dto/inventory-movements-report-query.dto';
import { InventoryMovementsReportResponseDto } from './dto/inventory-movements-report-response.dto';
import { SalesByChannelQueryDto } from './dto/sales-by-channel-query.dto';
import { SalesByChannelReportResponseDto } from './dto/sales-by-channel-report-response.dto';
import { SalesByProductQueryDto } from './dto/sales-by-product-query.dto';
import { SalesByProductReportResponseDto } from './dto/sales-by-product-report-response.dto';
import { SalesByUserQueryDto } from './dto/sales-by-user-query.dto';
import { SalesByUserReportResponseDto } from './dto/sales-by-user-report-response.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { StockReportResponseDto } from './dto/stock-report-response.dto';
import { toInventoryMovementReportResponse } from './mappers/inventory-movement-report.mapper';
import {
  addDecimals,
  divideDecimals,
  multiplyDecimals,
  subtractDecimals,
  toSalesByChannelReportResponse,
  toSalesByProductReportResponse,
  toSalesByUserReportResponse,
} from './mappers/sales-report.mapper';
import { zeroDecimal } from './mappers/report-decimal.mapper';
import { toStockReportResponse } from './mappers/stock-report.mapper';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockReport(
    query: StockReportQueryDto,
  ): Promise<StockReportResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        active: typeof query.active === 'boolean' ? query.active : undefined,
        categoryId: query.categoryId,
        stockManagementType: query.stockManagementType,
        OR: query.search
          ? [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                sku: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        stock: {
          select: {
            currentStock: true,
            minimumStock: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const result = products.map(toStockReportResponse);
    if (!query.stockStatus) {
      return result;
    }

    return result.filter((item) => item.stockStatus === query.stockStatus);
  }

  async getSalesByChannelReport(
    query: SalesByChannelQueryDto,
  ): Promise<SalesByChannelReportResponseDto[]> {
    const tickets = await this.prisma.saleTicket.findMany({
      where: {
        status: SaleTicketStatus.CONFIRMED,
        salesChannelId: query.salesChannelId,
        confirmedAt: this.buildDateRange(query.from, query.to),
      },
      include: {
        salesChannel: {
          select: {
            name: true,
            code: true,
          },
        },
        items: {
          select: {
            ticketId: true,
            productId: true,
            productNameSnapshot: true,
            productSkuSnapshot: true,
            productUnitSnapshot: true,
            quantity: true,
            unitCostSnapshot: true,
            subtotal: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });

    const grouped = new Map<
      string,
      {
        salesChannelId: string;
        salesChannelName: string;
        salesChannelCode: string;
        ticketsCount: number;
        itemsCount: number;
        quantitySold: Decimal;
        grossSales: Decimal;
        historicalCost: Decimal;
      }
    >();

    for (const ticket of tickets) {
      const current = grouped.get(ticket.salesChannelId) ?? {
        salesChannelId: ticket.salesChannelId,
        salesChannelName: ticket.salesChannel.name,
        salesChannelCode: ticket.salesChannel.code,
        ticketsCount: 0,
        itemsCount: 0,
        quantitySold: zeroDecimal(),
        grossSales: zeroDecimal(),
        historicalCost: zeroDecimal(),
      };

      current.ticketsCount += 1;

      for (const item of ticket.items) {
        current.itemsCount += 1;
        current.quantitySold = addDecimals(current.quantitySold, item.quantity);
        current.grossSales = addDecimals(current.grossSales, item.subtotal);
        current.historicalCost = addDecimals(
          current.historicalCost,
          multiplyDecimals(item.unitCostSnapshot, item.quantity),
        );
      }

      grouped.set(ticket.salesChannelId, current);
    }

    return [...grouped.values()]
      .map((item) => {
        const grossProfit = subtractDecimals(
          item.grossSales,
          item.historicalCost,
        );

        return toSalesByChannelReportResponse({
          ...item,
          grossProfit,
          averageTicket: divideDecimals(item.grossSales, item.ticketsCount),
        });
      })
      .sort((left, right) => right.ticketsCount - left.ticketsCount);
  }

  async getSalesByProductReport(
    query: SalesByProductQueryDto,
  ): Promise<SalesByProductReportResponseDto[]> {
    const items = await this.prisma.saleTicketItem.findMany({
      where: {
        productId: query.productId,
        ticket: {
          status: SaleTicketStatus.CONFIRMED,
          salesChannelId: query.salesChannelId,
          confirmedAt: this.buildDateRange(query.from, query.to),
        },
      },
      select: {
        ticketId: true,
        productId: true,
        productNameSnapshot: true,
        productSkuSnapshot: true,
        productUnitSnapshot: true,
        quantity: true,
        unitCostSnapshot: true,
        subtotal: true,
        ticket: {
          select: {
            confirmedAt: true,
          },
        },
      },
      orderBy: {
        ticket: {
          confirmedAt: 'desc',
        },
      },
    });

    const grouped = new Map<
      string,
      {
        productId: string;
        productNameSnapshot: string;
        productSkuSnapshot: string | null;
        productUnitSnapshot: string;
        quantitySold: Decimal;
        grossSales: Decimal;
        historicalCost: Decimal;
        tickets: Set<string>;
        latestSnapshotAt: number;
      }
    >();

    for (const item of items) {
      const snapshotTimestamp = item.ticket.confirmedAt?.getTime() ?? 0;
      const current = grouped.get(item.productId) ?? {
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        productSkuSnapshot: item.productSkuSnapshot,
        productUnitSnapshot: item.productUnitSnapshot,
        quantitySold: zeroDecimal(),
        grossSales: zeroDecimal(),
        historicalCost: zeroDecimal(),
        tickets: new Set<string>(),
        latestSnapshotAt: snapshotTimestamp,
      };

      if (snapshotTimestamp >= current.latestSnapshotAt) {
        current.productNameSnapshot = item.productNameSnapshot;
        current.productSkuSnapshot = item.productSkuSnapshot;
        current.productUnitSnapshot = item.productUnitSnapshot;
        current.latestSnapshotAt = snapshotTimestamp;
      }

      current.quantitySold = addDecimals(current.quantitySold, item.quantity);
      current.grossSales = addDecimals(current.grossSales, item.subtotal);
      current.historicalCost = addDecimals(
        current.historicalCost,
        multiplyDecimals(item.unitCostSnapshot, item.quantity),
      );
      current.tickets.add(item.ticketId);
      grouped.set(item.productId, current);
    }

    return [...grouped.values()]
      .map((item) =>
        toSalesByProductReportResponse({
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          productSkuSnapshot: item.productSkuSnapshot,
          productUnitSnapshot: item.productUnitSnapshot,
          quantitySold: item.quantitySold,
          grossSales: item.grossSales,
          historicalCost: item.historicalCost,
          grossProfit: subtractDecimals(item.grossSales, item.historicalCost),
          ticketsCount: item.tickets.size,
        }),
      )
      .sort((left, right) => right.ticketsCount - left.ticketsCount);
  }

  async getSalesByUserReport(
    query: SalesByUserQueryDto,
  ): Promise<SalesByUserReportResponseDto[]> {
    const tickets = await this.prisma.saleTicket.findMany({
      where: {
        status: SaleTicketStatus.CONFIRMED,
        salesChannelId: query.salesChannelId,
        confirmedById: query.userId,
        confirmedAt: this.buildDateRange(query.from, query.to),
      },
      select: {
        id: true,
        confirmedById: true,
        items: {
          select: {
            quantity: true,
            unitCostSnapshot: true,
            subtotal: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });

    const userIds = [
      ...new Set(
        tickets
          .map((ticket) => ticket.confirmedById)
          .filter((userId): userId is string => typeof userId === 'string'),
      ),
    ];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        })
      : [];
    const usersById = new Map(
      users.map((user) => [
        user.id,
        {
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`.trim(),
        },
      ]),
    );

    const grouped = new Map<
      string,
      {
        userId: string | null;
        ticketsCount: number;
        itemsCount: number;
        quantitySold: Decimal;
        grossSales: Decimal;
        historicalCost: Decimal;
      }
    >();

    for (const ticket of tickets) {
      const groupKey = ticket.confirmedById ?? 'unknown';
      const current = grouped.get(groupKey) ?? {
        userId: ticket.confirmedById,
        ticketsCount: 0,
        itemsCount: 0,
        quantitySold: zeroDecimal(),
        grossSales: zeroDecimal(),
        historicalCost: zeroDecimal(),
      };

      current.ticketsCount += 1;
      for (const item of ticket.items) {
        current.itemsCount += 1;
        current.quantitySold = addDecimals(current.quantitySold, item.quantity);
        current.grossSales = addDecimals(current.grossSales, item.subtotal);
        current.historicalCost = addDecimals(
          current.historicalCost,
          multiplyDecimals(item.unitCostSnapshot, item.quantity),
        );
      }

      grouped.set(groupKey, current);
    }

    return [...grouped.values()]
      .map((item) => {
        const user = item.userId ? usersById.get(item.userId) : undefined;

        return toSalesByUserReportResponse({
          userId: item.userId,
          userEmail: user?.email ?? null,
          userFullName: user?.fullName ?? null,
          ticketsCount: item.ticketsCount,
          itemsCount: item.itemsCount,
          quantitySold: item.quantitySold,
          grossSales: item.grossSales,
          historicalCost: item.historicalCost,
          grossProfit: subtractDecimals(item.grossSales, item.historicalCost),
        });
      })
      .sort((left, right) => right.ticketsCount - left.ticketsCount);
  }

  async getInventoryMovementsReport(
    query: InventoryMovementsReportQueryDto,
  ): Promise<InventoryMovementsReportResponseDto> {
    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;
    const where = {
      productId: query.productId,
      movementType: query.movementType,
      referenceType: query.referenceType,
      createdById: query.createdById,
      createdAt: this.buildDateRange(query.from, query.to),
    } satisfies Prisma.InventoryMovementWhereInput;

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    const userIds = [
      ...new Set(
        movements
          .map((movement) => movement.createdById)
          .filter((userId): userId is string => typeof userId === 'string'),
      ),
    ];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        })
      : [];
    const usersById = new Map(
      users.map((user) => [
        user.id,
        {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
        },
      ]),
    );

    return {
      items: movements.map((movement) =>
        toInventoryMovementReportResponse({
          ...movement,
          createdBy: movement.createdById
            ? usersById.get(movement.createdById) ?? null
            : null,
        }),
      ),
      limit,
      offset,
      total,
    };
  }

  private buildDateRange(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }

    return {
      gte: from,
      lte: to,
    };
  }
}
