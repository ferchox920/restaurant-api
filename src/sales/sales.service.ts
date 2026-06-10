import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockManagementType } from '../products/product.enums';
import { AddSaleTicketItemDto } from './dto/add-sale-ticket-item.dto';
import { CancelSaleTicketDto } from './dto/cancel-sale-ticket.dto';
import { ConfirmSaleTicketDto } from './dto/confirm-sale-ticket.dto';
import { CreateSaleTicketDto } from './dto/create-sale-ticket.dto';
import { SaleTicketQueryDto } from './dto/sale-ticket-query.dto';
import { SaleTicketResponseDto } from './dto/sale-ticket-response.dto';
import { UpdateSaleTicketItemDto } from './dto/update-sale-ticket-item.dto';
import { UpdateSaleTicketDto } from './dto/update-sale-ticket.dto';
import { VoidSaleTicketDto } from './dto/void-sale-ticket.dto';
import { toSaleTicketResponse } from './mappers/sale-ticket-response.mapper';
import { SaleTicketStatus } from './sales.enums';

type SalesTransactionClient = Prisma.TransactionClient;

const saleTicketInclude = {
  salesChannel: {
    select: {
      name: true,
    },
  },
  items: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      product: {
        select: {
          active: true,
          stockManagementType: true,
        },
      },
    },
  },
} satisfies Prisma.SaleTicketInclude;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(
    dto: CreateSaleTicketDto,
    createdById: string,
  ): Promise<SaleTicketResponseDto> {
    await this.ensureSalesChannelActive(dto.salesChannelId);

    const ticket = await this.prisma.saleTicket.create({
      data: {
        salesChannelId: dto.salesChannelId,
        notes: dto.notes,
        createdById,
        status: SaleTicketStatus.DRAFT,
        subtotal: new Decimal(0),
        discountTotal: new Decimal(0),
        commissionTotal: new Decimal(0),
        total: new Decimal(0),
      },
      include: saleTicketInclude,
    });

    return toSaleTicketResponse(ticket);
  }

  async findAll(query: SaleTicketQueryDto): Promise<SaleTicketResponseDto[]> {
    const numericSearch =
      query.search && /^\d+$/.test(query.search.trim())
        ? Number.parseInt(query.search.trim(), 10)
        : undefined;

    const tickets = await this.prisma.saleTicket.findMany({
      where: {
        status: query.status,
        salesChannelId: query.salesChannelId,
        createdById: query.createdById,
        createdAt:
          query.from || query.to
            ? {
                gte: query.from,
                lte: query.to,
              }
            : undefined,
        OR: query.search
          ? [
              ...(numericSearch !== undefined
                ? [{ ticketNumber: numericSearch }]
                : []),
              {
                notes: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      include: saleTicketInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tickets.map(toSaleTicketResponse);
  }

  async findOne(ticketId: string): Promise<SaleTicketResponseDto> {
    const ticket = await this.getTicketOrThrow(ticketId);
    return toSaleTicketResponse(ticket);
  }

  async update(
    ticketId: string,
    dto: UpdateSaleTicketDto,
  ): Promise<SaleTicketResponseDto> {
    await this.ensureTicketIsDraft(ticketId);

    const ticket = await this.prisma.saleTicket.update({
      where: { id: ticketId },
      data: {
        notes: dto.notes,
      },
      include: saleTicketInclude,
    });

    return toSaleTicketResponse(ticket);
  }

  async addItem(
    ticketId: string,
    dto: AddSaleTicketItemDto,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.prisma.$transaction(
      async (tx: SalesTransactionClient) => {
        const saleTicket = await this.ensureDraftTicket(tx, ticketId);
        const product = await this.findProductForSale(tx, dto.productId);
        const currentCost = await this.findCurrentCost(tx, dto.productId);
        const currentPrice = await this.findCurrentPrice(
          tx,
          dto.productId,
          saleTicket.salesChannelId,
        );

        const quantity = new Decimal(dto.quantity);
        const existingItem = await tx.saleTicketItem.findFirst({
          where: {
            ticketId,
            productId: product.id,
          },
        });

        if (existingItem) {
          const nextQuantity = existingItem.quantity.add(quantity);
          const subtotal = existingItem.unitPriceSnapshot.mul(nextQuantity);

          await tx.saleTicketItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: nextQuantity,
              subtotal,
            },
          });
        } else {
          const subtotal = currentPrice.price.mul(quantity);

          await tx.saleTicketItem.create({
            data: {
              ticketId,
              productId: product.id,
              productNameSnapshot: product.name,
              productSkuSnapshot: product.sku,
              productUnitSnapshot: product.unit,
              quantity,
              unitPriceSnapshot: currentPrice.price,
              unitCostSnapshot: currentCost.cost,
              subtotal,
            },
          });
        }

        await this.recalculateTicketTotals(tx, ticketId);
        return this.getTicketOrThrow(ticketId, tx);
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async updateItem(
    ticketId: string,
    itemId: string,
    dto: UpdateSaleTicketItemDto,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.prisma.$transaction(
      async (tx: SalesTransactionClient) => {
        await this.ensureDraftTicket(tx, ticketId);

        const item = await tx.saleTicketItem.findFirst({
          where: {
            id: itemId,
            ticketId,
          },
        });

        if (!item) {
          throw new NotFoundException(
            `Sale ticket item with id "${itemId}" was not found for ticket "${ticketId}".`,
          );
        }

        const quantity = new Decimal(dto.quantity);
        const subtotal = item.unitPriceSnapshot.mul(quantity);

        await tx.saleTicketItem.update({
          where: { id: itemId },
          data: {
            quantity,
            subtotal,
          },
        });

        await this.recalculateTicketTotals(tx, ticketId);
        return this.getTicketOrThrow(ticketId, tx);
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async removeItem(
    ticketId: string,
    itemId: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.prisma.$transaction(
      async (tx: SalesTransactionClient) => {
        await this.ensureDraftTicket(tx, ticketId);

        const item = await tx.saleTicketItem.findFirst({
          where: {
            id: itemId,
            ticketId,
          },
          select: {
            id: true,
          },
        });

        if (!item) {
          throw new NotFoundException(
            `Sale ticket item with id "${itemId}" was not found for ticket "${ticketId}".`,
          );
        }

        await tx.saleTicketItem.delete({
          where: { id: itemId },
        });

        await this.recalculateTicketTotals(tx, ticketId);
        return this.getTicketOrThrow(ticketId, tx);
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async cancel(
    ticketId: string,
    dto: CancelSaleTicketDto,
    cancelledById: string,
  ): Promise<SaleTicketResponseDto> {
    await this.ensureTicketIsDraft(ticketId);

    const ticket = await this.prisma.saleTicket.update({
      where: { id: ticketId },
      data: {
        status: SaleTicketStatus.CANCELLED,
        cancelledById,
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
      },
      include: saleTicketInclude,
    });

    return toSaleTicketResponse(ticket);
  }

  async confirm(
    ticketId: string,
    _dto: ConfirmSaleTicketDto,
    confirmedById: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.prisma.$transaction(
      async (tx: SalesTransactionClient) => {
        const saleTicket = await this.getTicketOrThrow(ticketId, tx);
        this.ensureTicketStatus(
          saleTicket.status,
          SaleTicketStatus.DRAFT,
          'Only sale tickets in DRAFT status can be confirmed in Sprint 7.',
        );

        if (saleTicket.items.length === 0) {
          throw new ConflictException(
            'A DRAFT sale ticket must contain at least one item before confirmation.',
          );
        }

        await this.ensureSalesChannelActive(saleTicket.salesChannelId, tx);
        this.ensureItemsCanBeConfirmed(saleTicket.items);
        this.ensureNoRecipeBasedItems(saleTicket.items);
        const inventoryItems = this.groupInventoryItems(saleTicket.items);

        for (const item of inventoryItems) {
          await this.inventoryService.applySaleOut(
            {
              productId: item.productId,
              quantity: item.quantity,
              reason: `Sale ticket ${ticketId} confirmation.`,
              referenceId: ticketId,
              createdById: confirmedById,
            },
            tx,
          );
        }

        await tx.saleTicket.update({
          where: { id: ticketId },
          data: {
            status: SaleTicketStatus.CONFIRMED,
            confirmedById,
            confirmedAt: new Date(),
          },
        });

        return this.getTicketOrThrow(ticketId, tx);
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async void(
    ticketId: string,
    dto: VoidSaleTicketDto,
    voidedById: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.prisma.$transaction(
      async (tx: SalesTransactionClient) => {
        const saleTicket = await this.getTicketOrThrow(ticketId, tx);
        this.ensureTicketStatus(
          saleTicket.status,
          SaleTicketStatus.CONFIRMED,
          'Only sale tickets in CONFIRMED status can be voided in Sprint 7.',
        );

        this.ensureNoRecipeBasedItems(saleTicket.items);
        const inventoryItems = this.groupInventoryItems(saleTicket.items);

        for (const item of inventoryItems) {
          await this.inventoryService.applyVoidReversal(
            {
              productId: item.productId,
              quantity: item.quantity,
              reason: dto.reason,
              referenceId: ticketId,
              createdById: voidedById,
            },
            tx,
          );
        }

        await tx.saleTicket.update({
          where: { id: ticketId },
          data: {
            status: SaleTicketStatus.VOIDED,
            voidedById,
            voidedAt: new Date(),
            voidReason: dto.reason,
          },
        });

        return this.getTicketOrThrow(ticketId, tx);
      },
    );

    return toSaleTicketResponse(ticket);
  }

  private async getTicketOrThrow(
    ticketId: string,
    tx?: SalesTransactionClient,
  ) {
    const prisma = tx ?? this.prisma;
    const ticket = await prisma.saleTicket.findUnique({
      where: { id: ticketId },
      include: saleTicketInclude,
    });

    if (!ticket) {
      throw new NotFoundException(
        `Sale ticket with id "${ticketId}" was not found.`,
      );
    }

    return ticket;
  }

  private async ensureTicketIsDraft(ticketId: string): Promise<void> {
    const ticket = await this.prisma.saleTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Sale ticket with id "${ticketId}" was not found.`,
      );
    }

    if (ticket.status !== SaleTicketStatus.DRAFT) {
      throw new ConflictException(
        'Only sale tickets in DRAFT status can be modified in Sprint 6.',
      );
    }
  }

  private async ensureDraftTicket(
    tx: SalesTransactionClient,
    ticketId: string,
  ) {
    const ticket = await tx.saleTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        salesChannelId: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Sale ticket with id "${ticketId}" was not found.`,
      );
    }

    this.ensureTicketStatus(
      ticket.status,
      SaleTicketStatus.DRAFT,
      'Only sale tickets in DRAFT status can be modified in Sprint 6.',
    );

    return ticket;
  }

  private async ensureSalesChannelActive(
    salesChannelId: string,
    tx?: SalesTransactionClient,
  ): Promise<void> {
    const prisma = tx ?? this.prisma;
    const salesChannel = await prisma.salesChannel.findUnique({
      where: { id: salesChannelId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!salesChannel) {
      throw new NotFoundException(
        `Sales channel with id "${salesChannelId}" was not found.`,
      );
    }

    if (!salesChannel.active) {
      throw new ConflictException(
        'The provided sales channel is inactive and cannot receive sale tickets.',
      );
    }
  }

  private async findProductForSale(
    tx: SalesTransactionClient,
    productId: string,
  ) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        active: true,
        stockManagementType: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id "${productId}" was not found.`,
      );
    }

    if (!product.active) {
      throw new ConflictException(
        'The provided product is inactive and cannot be added to a sale ticket.',
      );
    }

    if (product.stockManagementType === StockManagementType.RECIPE_BASED) {
      throw new ConflictException(
        'RECIPE_BASED products cannot be added to sale tickets in Sprint 6 because recipe stock consumption is not implemented yet.',
      );
    }

    return product;
  }

  private async findCurrentCost(
    tx: SalesTransactionClient,
    productId: string,
  ) {
    const currentCost = await tx.productCostHistory.findFirst({
      where: {
        productId,
        validTo: null,
      },
      orderBy: {
        validFrom: 'desc',
      },
    });

    if (!currentCost) {
      throw new NotFoundException(
        `Current cost for product with id "${productId}" was not found.`,
      );
    }

    return currentCost;
  }

  private async findCurrentPrice(
    tx: SalesTransactionClient,
    productId: string,
    salesChannelId: string,
  ) {
    const currentPrice = await tx.productPriceHistory.findFirst({
      where: {
        productId,
        salesChannelId,
        validTo: null,
      },
      orderBy: {
        validFrom: 'desc',
      },
    });

    if (!currentPrice) {
      throw new NotFoundException(
        `Current price for product "${productId}" and sales channel "${salesChannelId}" was not found.`,
      );
    }

    return currentPrice;
  }

  private async recalculateTicketTotals(
    tx: SalesTransactionClient,
    ticketId: string,
  ): Promise<void> {
    const totals = await tx.saleTicketItem.aggregate({
      where: { ticketId },
      _sum: {
        subtotal: true,
      },
    });

    const subtotal = totals._sum.subtotal ?? new Decimal(0);

    await tx.saleTicket.update({
      where: { id: ticketId },
      data: {
        subtotal,
        total: subtotal,
      },
    });
  }

  private ensureTicketStatus(
    currentStatus: string,
    expectedStatus: string,
    message: string,
  ): void {
    if (currentStatus !== expectedStatus) {
      throw new ConflictException(message);
    }
  }

  private ensureNoRecipeBasedItems(
    items: Array<{
      product: {
        active: boolean;
        stockManagementType: StockManagementType;
      };
    }>,
  ): void {
    const hasRecipeBasedItem = items.some(
      (item) =>
        item.product.stockManagementType === StockManagementType.RECIPE_BASED,
    );

    if (hasRecipeBasedItem) {
      throw new ConflictException(
        'RECIPE_BASED products cannot be confirmed or voided in Sprint 7 because recipe stock consumption is not implemented yet.',
      );
    }
  }

  private ensureItemsCanBeConfirmed(
    items: Array<{
      product: {
        active: boolean;
        stockManagementType: StockManagementType;
      };
    }>,
  ): void {
    const hasInactiveProduct = items.some((item) => item.product.active === false);

    if (hasInactiveProduct) {
      throw new ConflictException(
        'A DRAFT sale ticket cannot be confirmed because it contains inactive products.',
      );
    }
  }

  private groupInventoryItems(
    items: Array<{
      productId: string;
      quantity: Decimal;
      product: {
        stockManagementType: StockManagementType;
      };
    }>,
  ): Array<{ productId: string; quantity: Decimal }> {
    const grouped = new Map<string, Decimal>();

    for (const item of items) {
      if (item.product.stockManagementType !== StockManagementType.FINISHED_PRODUCT) {
        continue;
      }

      grouped.set(
        item.productId,
        (grouped.get(item.productId) ?? new Decimal(0)).add(item.quantity),
      );
    }

    return Array.from(grouped.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }
}
