import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
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
import { StockReportPagedResponseDto } from './dto/stock-report-paged-response.dto';
import { toInventoryMovementReportResponse } from './mappers/inventory-movement-report.mapper';
import {
  divideDecimals,
  subtractDecimals,
  toSalesByChannelReportResponse,
  toSalesByProductReportResponse,
  toSalesByUserReportResponse,
} from './mappers/sales-report.mapper';
import { toStockReportResponse } from './mappers/stock-report.mapper';

type SalesByChannelAggregateRow = {
  salesChannelId: string;
  salesChannelName: string;
  salesChannelCode: string;
  ticketsCount: number;
  itemsCount: number;
  quantitySold: Decimal;
  grossSales: Decimal;
  historicalCost: Decimal;
};

type SalesByProductAggregateRow = {
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string | null;
  productUnitSnapshot: string;
  quantitySold: Decimal;
  grossSales: Decimal;
  historicalCost: Decimal;
  ticketsCount: number;
};

type SalesByUserAggregateRow = {
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  ticketsCount: number;
  itemsCount: number;
  quantitySold: Decimal;
  grossSales: Decimal;
  historicalCost: Decimal;
};

type StockPagedRow = {
  productId: string;
  productName: string;
  productSku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unit: string;
  stockManagementType: string;
  active: boolean;
  currentStock: Decimal;
  minimumStock: Decimal;
  stockStatus: string;
  updatedAt: Date;
};

type StockSummaryRow = {
  total: bigint;
  available: bigint;
  lowStock: bigint;
  outOfStock: bigint;
  notTracked: bigint;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService = {
      get: () => false,
    } as unknown as ConfigService,
  ) {}

  getStockReport(
    query: StockReportQueryDto & { responseMode: 'paged' },
  ): Promise<StockReportPagedResponseDto>;
  getStockReport(
    query: StockReportQueryDto & { responseMode?: undefined },
  ): Promise<StockReportResponseDto[]>;
  getStockReport(
    query: StockReportQueryDto,
  ): Promise<StockReportResponseDto[] | StockReportPagedResponseDto>;
  async getStockReport(
    query: StockReportQueryDto,
  ): Promise<StockReportResponseDto[] | StockReportPagedResponseDto> {
    if (query.responseMode === 'paged') {
      if (!this.config.get<boolean>('STOCK_REPORT_PAGED')) {
        throw new NotFoundException();
      }
      return this.getPagedStockReport(query);
    }

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

  private async getPagedStockReport(
    query: StockReportQueryDto,
  ): Promise<StockReportPagedResponseDto> {
    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;
    const statusExpression = Prisma.sql`
      CASE
        WHEN product."stockManagementType" <> 'FINISHED_PRODUCT'::"StockManagementType" THEN 'NOT_TRACKED'
        WHEN COALESCE(stock."currentStock", 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(stock."currentStock", 0) <= COALESCE(stock."minimumStock", 0) THEN 'LOW_STOCK'
        ELSE 'AVAILABLE'
      END`;
    const conditions: Prisma.Sql[] = [];

    if (typeof query.active === 'boolean') {
      conditions.push(Prisma.sql`product."active" = ${query.active}`);
    }
    if (query.categoryId) {
      conditions.push(
        Prisma.sql`product."categoryId" = ${query.categoryId}::uuid`,
      );
    }
    if (query.stockManagementType) {
      conditions.push(
        Prisma.sql`product."stockManagementType" = ${query.stockManagementType}::"StockManagementType"`,
      );
    }
    if (query.search?.trim()) {
      const pattern = `%${query.search.trim()}%`;
      conditions.push(
        Prisma.sql`(product."name" ILIKE ${pattern} OR product."sku" ILIKE ${pattern})`,
      );
    }
    if (query.stockStatus) {
      conditions.push(Prisma.sql`${statusExpression} = ${query.stockStatus}`);
    }

    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
    const from = Prisma.sql`
      FROM "Product" product
      LEFT JOIN "Category" category ON category."id" = product."categoryId"
      LEFT JOIN "ProductStock" stock ON stock."productId" = product."id"
      ${where}`;

    const [rows, summaries] = await Promise.all([
      this.prisma.$queryRaw<StockPagedRow[]>(Prisma.sql`
        SELECT
          product."id" AS "productId",
          product."name" AS "productName",
          product."sku" AS "productSku",
          product."categoryId",
          category."name" AS "categoryName",
          product."unit"::text AS "unit",
          product."stockManagementType"::text AS "stockManagementType",
          product."active",
          COALESCE(stock."currentStock", 0) AS "currentStock",
          COALESCE(stock."minimumStock", 0) AS "minimumStock",
          ${statusExpression} AS "stockStatus",
          COALESCE(stock."updatedAt", product."updatedAt") AS "updatedAt"
        ${from}
        ORDER BY product."name" ASC, product."id" ASC
        LIMIT ${limit} OFFSET ${offset}`),
      this.prisma.$queryRaw<StockSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS "total",
          COUNT(*) FILTER (WHERE ${statusExpression} = 'AVAILABLE')::bigint AS "available",
          COUNT(*) FILTER (WHERE ${statusExpression} = 'LOW_STOCK')::bigint AS "lowStock",
          COUNT(*) FILTER (WHERE ${statusExpression} = 'OUT_OF_STOCK')::bigint AS "outOfStock",
          COUNT(*) FILTER (WHERE ${statusExpression} = 'NOT_TRACKED')::bigint AS "notTracked"
        ${from}`),
    ]);
    const summary = summaries[0] ?? {
      total: 0n,
      available: 0n,
      lowStock: 0n,
      outOfStock: 0n,
      notTracked: 0n,
    };

    return {
      items: rows.map((row) => ({
        ...row,
        stockManagementType: row.stockManagementType,
        currentStock: row.currentStock.toString(),
        minimumStock: row.minimumStock.toString(),
      })),
      summary: {
        available: Number(summary.available),
        lowStock: Number(summary.lowStock),
        outOfStock: Number(summary.outOfStock),
        notTracked: Number(summary.notTracked),
      },
      total: Number(summary.total),
      limit,
      offset,
    };
  }

  async getSalesByChannelReport(
    query: SalesByChannelQueryDto,
  ): Promise<SalesByChannelReportResponseDto[]> {
    const conditions = this.buildConfirmedSalesSqlConditions({
      salesChannelId: query.salesChannelId,
      from: query.from,
      to: query.to,
    });
    const rows = await this.prisma.$queryRaw<SalesByChannelAggregateRow[]>(
      Prisma.sql`
        SELECT
          ticket."salesChannelId" AS "salesChannelId",
          channel."name" AS "salesChannelName",
          channel."code" AS "salesChannelCode",
          COUNT(DISTINCT ticket."id")::int AS "ticketsCount",
          COUNT(item."id")::int AS "itemsCount",
          COALESCE(SUM(item."quantity"), 0) AS "quantitySold",
          COALESCE(SUM(item."subtotal"), 0) AS "grossSales",
          COALESCE(SUM(item."unitCostSnapshot" * item."quantity"), 0) AS "historicalCost"
        FROM "SaleTicket" ticket
        INNER JOIN "SalesChannel" channel ON channel."id" = ticket."salesChannelId"
        INNER JOIN "SaleTicketItem" item ON item."ticketId" = ticket."id"
        WHERE ${Prisma.join(conditions, ' AND ')}
        GROUP BY ticket."salesChannelId", channel."name", channel."code"
        ORDER BY "ticketsCount" DESC, ticket."salesChannelId" ASC
      `,
    );

    return rows.map((row) =>
      toSalesByChannelReportResponse({
        ...row,
        grossProfit: subtractDecimals(row.grossSales, row.historicalCost),
        averageTicket: divideDecimals(row.grossSales, row.ticketsCount),
      }),
    );
  }

  async getSalesByProductReport(
    query: SalesByProductQueryDto,
  ): Promise<SalesByProductReportResponseDto[]> {
    const conditions = this.buildConfirmedSalesSqlConditions({
      salesChannelId: query.salesChannelId,
      productId: query.productId,
      from: query.from,
      to: query.to,
    });
    const rows = await this.prisma.$queryRaw<SalesByProductAggregateRow[]>(
      Prisma.sql`
        WITH filtered_items AS (
          SELECT
            item."id",
            item."ticketId",
            item."productId",
            item."productNameSnapshot",
            item."productSkuSnapshot",
            item."productUnitSnapshot",
            item."quantity",
            item."unitCostSnapshot",
            item."subtotal",
            ticket."confirmedAt"
          FROM "SaleTicketItem" item
          INNER JOIN "SaleTicket" ticket ON ticket."id" = item."ticketId"
          WHERE ${Prisma.join(conditions, ' AND ')}
        ),
        aggregated AS (
          SELECT
            "productId",
            SUM("quantity") AS "quantitySold",
            SUM("subtotal") AS "grossSales",
            SUM("unitCostSnapshot" * "quantity") AS "historicalCost",
            COUNT(DISTINCT "ticketId")::int AS "ticketsCount"
          FROM filtered_items
          GROUP BY "productId"
        ),
        latest_snapshot AS (
          SELECT DISTINCT ON ("productId")
            "productId",
            "productNameSnapshot",
            "productSkuSnapshot",
            "productUnitSnapshot"
          FROM filtered_items
          ORDER BY "productId", "confirmedAt" DESC NULLS LAST, "id" DESC
        )
        SELECT
          aggregated."productId",
          latest_snapshot."productNameSnapshot",
          latest_snapshot."productSkuSnapshot",
          latest_snapshot."productUnitSnapshot"::text AS "productUnitSnapshot",
          aggregated."quantitySold",
          aggregated."grossSales",
          aggregated."historicalCost",
          aggregated."ticketsCount"
        FROM aggregated
        INNER JOIN latest_snapshot USING ("productId")
        ORDER BY aggregated."ticketsCount" DESC, aggregated."productId" ASC
      `,
    );

    return rows.map((row) =>
      toSalesByProductReportResponse({
        ...row,
        grossProfit: subtractDecimals(row.grossSales, row.historicalCost),
      }),
    );
  }

  async getSalesByUserReport(
    query: SalesByUserQueryDto,
  ): Promise<SalesByUserReportResponseDto[]> {
    const conditions = this.buildConfirmedSalesSqlConditions({
      salesChannelId: query.salesChannelId,
      userId: query.userId,
      from: query.from,
      to: query.to,
    });
    const rows = await this.prisma.$queryRaw<SalesByUserAggregateRow[]>(
      Prisma.sql`
        SELECT
          ticket."confirmedById" AS "userId",
          actor."email" AS "userEmail",
          CASE
            WHEN actor."id" IS NULL THEN NULL
            ELSE TRIM(CONCAT(actor."firstName", ' ', actor."lastName"))
          END AS "userFullName",
          COUNT(DISTINCT ticket."id")::int AS "ticketsCount",
          COUNT(item."id")::int AS "itemsCount",
          COALESCE(SUM(item."quantity"), 0) AS "quantitySold",
          COALESCE(SUM(item."subtotal"), 0) AS "grossSales",
          COALESCE(SUM(item."unitCostSnapshot" * item."quantity"), 0) AS "historicalCost"
        FROM "SaleTicket" ticket
        INNER JOIN "SaleTicketItem" item ON item."ticketId" = ticket."id"
        LEFT JOIN "User" actor ON actor."id" = ticket."confirmedById"
        WHERE ${Prisma.join(conditions, ' AND ')}
        GROUP BY ticket."confirmedById", actor."id", actor."email", actor."firstName", actor."lastName"
        ORDER BY "ticketsCount" DESC, ticket."confirmedById" ASC NULLS LAST
      `,
    );

    return rows.map((row) =>
      toSalesByUserReportResponse({
        ...row,
        grossProfit: subtractDecimals(row.grossSales, row.historicalCost),
      }),
    );
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
            ? (usersById.get(movement.createdById) ?? null)
            : null,
        }),
      ),
      limit,
      offset,
      total,
    };
  }

  private buildConfirmedSalesSqlConditions(filters: {
    salesChannelId?: string;
    productId?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }): Prisma.Sql[] {
    const conditions = [
      Prisma.sql`ticket."status" = ${SaleTicketStatus.CONFIRMED}::"SaleTicketStatus"`,
    ];

    if (filters.salesChannelId) {
      conditions.push(
        Prisma.sql`ticket."salesChannelId" = ${filters.salesChannelId}::uuid`,
      );
    }

    if (filters.productId) {
      conditions.push(
        Prisma.sql`item."productId" = ${filters.productId}::uuid`,
      );
    }

    if (filters.userId) {
      conditions.push(
        Prisma.sql`ticket."confirmedById" = ${filters.userId}::uuid`,
      );
    }

    if (filters.from) {
      conditions.push(Prisma.sql`ticket."confirmedAt" >= ${filters.from}`);
    }

    if (filters.to) {
      conditions.push(Prisma.sql`ticket."confirmedAt" <= ${filters.to}`);
    }

    return conditions;
  }

  private buildDateRange(
    from?: Date,
    to?: Date,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }

    return {
      gte: from,
      lte: to,
    };
  }
}
