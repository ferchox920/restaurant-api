import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { runSerializableTransaction } from '../database/transaction';
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
import { SalePaymentMethod, SaleTicketStatus } from './sales.enums';

type SalesTransactionClient = Prisma.TransactionClient;

const saleTicketInclude = {
  salesChannel: {
    select: {
      name: true,
    },
  },
  paymentBank: {
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
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
    private readonly configService: ConfigService = {
      get: () => false,
    } as unknown as ConfigService,
  ) {}

  async create(
    dto: CreateSaleTicketDto,
    createdById: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) =>
        this.createDraftInTransaction(dto, createdById, tx),
    );

    return toSaleTicketResponse(ticket);
  }

  async createDraftInTransaction(
    dto: CreateSaleTicketDto,
    createdById: string,
    tx: SalesTransactionClient,
  ) {
    await this.ensureSalesChannelActive(dto.salesChannelId, tx);

    const paymentSelection = await this.resolvePaymentSelection(
      {
        paymentMethod: dto.paymentMethod,
        paymentBankId: dto.paymentBankId,
      },
      tx,
    );

    const createdTicket = await tx.saleTicket.create({
      data: {
        salesChannelId: dto.salesChannelId,
        notes: dto.notes,
        paymentMethod: paymentSelection.paymentMethod,
        paymentBankId: paymentSelection.paymentBankId,
        paymentBankNameSnapshot: paymentSelection.paymentBankNameSnapshot,
        createdById,
        status: SaleTicketStatus.DRAFT,
        subtotal: new Decimal(0),
        discountTotal: new Decimal(0),
        commissionTotal: new Decimal(0),
        total: new Decimal(0),
      },
      include: saleTicketInclude,
    });

    await this.auditService.log(
      {
        userId: createdById,
        action: AuditAction.SALE_TICKET_CREATED,
        entityType: AuditEntityType.SALE_TICKET,
        entityId: createdTicket.id,
        beforeData: null,
        afterData: this.serializeSaleTicket(createdTicket),
      },
      tx,
    );

    return createdTicket;
  }

  async findAll(query: SaleTicketQueryDto): Promise<SaleTicketResponseDto[]> {
    const numericSearch =
      query.search && /^\d+$/.test(query.search.trim())
        ? Number.parseInt(query.search.trim(), 10)
        : undefined;

    const where = {
      status: query.status,
      salesChannelId: query.salesChannelId,
      createdById: query.createdById,
      createdAt:
        query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
      OR: query.search
        ? [
            ...(numericSearch !== undefined
              ? [{ ticketNumber: numericSearch }]
              : []),
            { notes: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    } satisfies Prisma.SaleTicketWhereInput;

    if (
      query.responseMode === 'summary' &&
      this.configService.get<boolean>('SALE_TICKET_SUMMARY_LIST')
    ) {
      const summaries = await this.prisma.saleTicket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          salesChannelId: true,
          status: true,
          paymentMethod: true,
          paymentBankId: true,
          paymentBankNameSnapshot: true,
          subtotal: true,
          discountTotal: true,
          commissionTotal: true,
          total: true,
          notes: true,
          createdById: true,
          confirmedById: true,
          cancelledById: true,
          voidedById: true,
          cancellationReason: true,
          voidReason: true,
          createdAt: true,
          updatedAt: true,
          confirmedAt: true,
          cancelledAt: true,
          voidedAt: true,
          version: true,
          salesChannel: { select: { name: true } },
          paymentBank: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      });
      return summaries.map((ticket) => ({
        ...toSaleTicketResponse({ ...ticket, items: [] }),
        itemsCount: ticket._count.items,
      })) as SaleTicketResponseDto[];
    }

    const tickets = await this.prisma.saleTicket.findMany({
      where,
      include: saleTicketInclude,
      orderBy: {
        createdAt: 'desc',
      },
      ...(query.limit !== undefined ? { take: query.limit } : {}),
      ...(query.offset !== undefined ? { skip: query.offset } : {}),
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
    actorUserId?: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) => {
        const existingTicket = await this.getTicketOrThrow(ticketId, tx);
        this.assertExpectedVersion(existingTicket, dto.expectedVersion);
        this.ensureTicketStatus(
          existingTicket.status,
          SaleTicketStatus.DRAFT,
          'Only sale tickets in DRAFT status can be modified.',
        );

        const shouldUpdatePayment =
          dto.paymentMethod !== undefined || dto.paymentBankId !== undefined;
        const paymentSelection = shouldUpdatePayment
          ? await this.resolvePaymentSelection(
              {
                paymentMethod: dto.paymentMethod,
                paymentBankId: dto.paymentBankId,
              },
              tx,
            )
          : null;

        const updatedTicket = await tx.saleTicket.update({
          where: { id: ticketId },
          data: {
            notes: dto.notes,
            version: { increment: 1 },
            paymentMethod: shouldUpdatePayment
              ? (paymentSelection?.paymentMethod ?? null)
              : undefined,
            paymentBankId: shouldUpdatePayment
              ? (paymentSelection?.paymentBankId ?? null)
              : undefined,
            paymentBankNameSnapshot: shouldUpdatePayment
              ? (paymentSelection?.paymentBankNameSnapshot ?? null)
              : undefined,
          },
          include: saleTicketInclude,
        });

        await this.emitOperationEvent(tx, updatedTicket);

        await this.auditService.log(
          {
            userId: actorUserId,
            action: AuditAction.SALE_TICKET_UPDATED,
            entityType: AuditEntityType.SALE_TICKET,
            entityId: updatedTicket.id,
            beforeData: this.serializeSaleTicket(existingTicket),
            afterData: this.serializeSaleTicket(updatedTicket),
          },
          tx,
        );

        return updatedTicket;
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async addItem(
    ticketId: string,
    dto: AddSaleTicketItemDto,
    actorUserId?: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) => {
        const saleTicket = await this.ensureDraftTicket(tx, ticketId);
        this.assertExpectedVersion(saleTicket, dto.expectedVersion);
        const { product, currentCost, currentPrice } =
          await this.findProductSalesContext(
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

        let itemId: string;
        let beforeItem: ReturnType<
          SalesService['serializeSaleTicketItem']
        > | null;
        let afterItem: ReturnType<SalesService['serializeSaleTicketItem']>;

        if (existingItem) {
          const nextQuantity = existingItem.quantity.add(quantity);
          const subtotal = existingItem.unitPriceSnapshot.mul(nextQuantity);

          const updatedItem = await tx.saleTicketItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: nextQuantity,
              subtotal,
            },
          });

          itemId = updatedItem?.id ?? existingItem.id;
          beforeItem = this.serializeSaleTicketItem(existingItem);
          afterItem = this.serializeSaleTicketItem({
            ...existingItem,
            id: updatedItem?.id ?? existingItem.id,
            quantity: nextQuantity,
            subtotal,
            updatedAt: updatedItem?.updatedAt ?? existingItem.updatedAt,
          });
        } else {
          const subtotal = currentPrice.price.mul(quantity);

          const createdItem = await tx.saleTicketItem.create({
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

          itemId = createdItem?.id ?? 'pending-sale-ticket-item';
          beforeItem = null;
          afterItem = this.serializeSaleTicketItem({
            id: createdItem?.id ?? 'pending-sale-ticket-item',
            ticketId,
            productId: product.id,
            productNameSnapshot: product.name,
            productSkuSnapshot: product.sku,
            productUnitSnapshot: product.unit,
            quantity,
            unitPriceSnapshot: currentPrice.price,
            unitCostSnapshot: currentCost.cost,
            subtotal,
            createdAt: createdItem?.createdAt,
            updatedAt: createdItem?.updatedAt,
          });
        }

        await this.recalculateTicketTotals(tx, ticketId);
        const updatedTicket = await this.getTicketOrThrow(ticketId, tx);

        await this.emitOperationEvent(tx, updatedTicket);

        await this.auditService.log(
          {
            userId: actorUserId,
            action: AuditAction.SALE_TICKET_ITEM_ADDED,
            entityType: AuditEntityType.SALE_TICKET_ITEM,
            entityId: itemId,
            beforeData: beforeItem,
            afterData: afterItem,
            metadata: {
              ticketId,
              ticketStatus: updatedTicket.status,
              ticketTotal: updatedTicket.total.toString(),
            },
          },
          tx,
        );

        return updatedTicket;
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async updateItem(
    ticketId: string,
    itemId: string,
    dto: UpdateSaleTicketItemDto,
    actorUserId?: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) => {
        const saleTicket = await this.ensureDraftTicket(tx, ticketId);
        this.assertExpectedVersion(saleTicket, dto.expectedVersion);

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

        const updatedItem = await tx.saleTicketItem.update({
          where: { id: itemId },
          data: {
            quantity,
            subtotal,
          },
        });

        await this.recalculateTicketTotals(tx, ticketId);
        const updatedTicket = await this.getTicketOrThrow(ticketId, tx);

        await this.emitOperationEvent(tx, updatedTicket);

        await this.auditService.log(
          {
            userId: actorUserId,
            action: AuditAction.SALE_TICKET_ITEM_UPDATED,
            entityType: AuditEntityType.SALE_TICKET_ITEM,
            entityId: updatedItem?.id ?? item.id,
            beforeData: this.serializeSaleTicketItem(item),
            afterData: this.serializeSaleTicketItem({
              ...item,
              id: updatedItem?.id ?? item.id,
              quantity,
              subtotal,
              updatedAt: updatedItem?.updatedAt ?? item.updatedAt,
            }),
            metadata: {
              ticketId,
              ticketStatus: updatedTicket.status,
              ticketTotal: updatedTicket.total.toString(),
            },
          },
          tx,
        );

        return updatedTicket;
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async removeItem(
    ticketId: string,
    itemId: string,
    actorUserId?: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
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

        const removedItem = await tx.saleTicketItem.delete({
          where: { id: itemId },
        });

        await this.recalculateTicketTotals(tx, ticketId);
        const updatedTicket = await this.getTicketOrThrow(ticketId, tx);

        await this.emitOperationEvent(tx, updatedTicket);

        await this.auditService.log(
          {
            userId: actorUserId,
            action: AuditAction.SALE_TICKET_ITEM_REMOVED,
            entityType: AuditEntityType.SALE_TICKET_ITEM,
            entityId: removedItem?.id ?? item.id,
            beforeData: this.serializeSaleTicketItem(
              (removedItem ?? item) as Parameters<
                SalesService['serializeSaleTicketItem']
              >[0],
            ),
            afterData: null,
            metadata: {
              ticketId,
              ticketStatus: updatedTicket.status,
              ticketTotal: updatedTicket.total.toString(),
            },
          },
          tx,
        );

        return updatedTicket;
      },
    );

    return toSaleTicketResponse(ticket);
  }

  async cancel(
    ticketId: string,
    dto: CancelSaleTicketDto,
    cancelledById: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) =>
        this.cancelDraftInTransaction(ticketId, dto, cancelledById, tx),
    );

    return toSaleTicketResponse(ticket);
  }

  async cancelDraftInTransaction(
    ticketId: string,
    dto: CancelSaleTicketDto,
    cancelledById: string,
    tx: SalesTransactionClient,
  ) {
    const existingTicket = await this.getTicketOrThrow(ticketId, tx);
    this.assertExpectedVersion(existingTicket, dto.expectedVersion);
    this.ensureTicketStatus(
      existingTicket.status,
      SaleTicketStatus.DRAFT,
      'Only sale tickets in DRAFT status can be modified.',
    );

    const updatedTicket = await tx.saleTicket.update({
      where: { id: ticketId },
      data: {
        status: SaleTicketStatus.CANCELLED,
        version: { increment: 1 },
        cancelledById,
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
      },
      include: saleTicketInclude,
    });

    await this.emitOperationEvent(tx, updatedTicket);

    await this.auditService.log(
      {
        userId: cancelledById,
        action: AuditAction.SALE_TICKET_CANCELLED,
        entityType: AuditEntityType.SALE_TICKET,
        entityId: updatedTicket.id,
        beforeData: this.serializeSaleTicket(existingTicket),
        afterData: this.serializeSaleTicket(updatedTicket),
      },
      tx,
    );

    return updatedTicket;
  }

  async confirm(
    ticketId: string,
    dto: ConfirmSaleTicketDto,
    confirmedById: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) =>
        this.confirmDraftInTransaction(ticketId, dto, confirmedById, tx),
    );

    return toSaleTicketResponse(ticket);
  }

  async confirmDraftInTransaction(
    ticketId: string,
    dto: ConfirmSaleTicketDto,
    confirmedById: string,
    tx: SalesTransactionClient,
  ) {
    const saleTicket = await this.getTicketOrThrow(ticketId, tx);
    this.assertExpectedVersion(saleTicket, dto.expectedVersion);
    this.ensureTicketStatus(
      saleTicket.status,
      SaleTicketStatus.DRAFT,
      'Only sale tickets in DRAFT status can be confirmed.',
    );

    if (saleTicket.items.length === 0) {
      throw new ConflictException(
        'A DRAFT sale ticket must contain at least one item before confirmation.',
      );
    }

    await this.ensureSalesChannelActive(saleTicket.salesChannelId, tx);
    const paymentSelection = await this.resolvePaymentSelection(
      {
        paymentMethod:
          dto.paymentMethod ?? saleTicket.paymentMethod ?? undefined,
        paymentBankId:
          dto.paymentBankId ?? saleTicket.paymentBankId ?? undefined,
      },
      tx,
      true,
    );
    this.ensureItemsCanBeConfirmed(saleTicket.items);
    this.ensureNoRecipeBasedItems(saleTicket.items);
    const inventoryItems = this.groupInventoryItems(saleTicket.items);

    const inventoryMovements = [];

    for (const item of inventoryItems) {
      const movement = await this.inventoryService.applySaleOut(
        {
          productId: item.productId,
          quantity: item.quantity,
          reason: `Sale ticket ${ticketId} confirmation.`,
          referenceId: ticketId,
          createdById: confirmedById,
        },
        tx,
      );

      inventoryMovements.push(movement);
    }

    await tx.saleTicket.update({
      where: { id: ticketId },
      data: {
        status: SaleTicketStatus.CONFIRMED,
        version: { increment: 1 },
        confirmedById,
        confirmedAt: new Date(),
        paymentMethod: paymentSelection.paymentMethod,
        paymentBankId: paymentSelection.paymentBankId,
        paymentBankNameSnapshot: paymentSelection.paymentBankNameSnapshot,
      },
    });

    const updatedTicket = await this.getTicketOrThrow(ticketId, tx);

    await this.emitOperationEvent(tx, updatedTicket);

    await this.auditService.log(
      {
        userId: confirmedById,
        action: AuditAction.SALE_TICKET_CONFIRMED,
        entityType: AuditEntityType.SALE_TICKET,
        entityId: updatedTicket.id,
        beforeData: this.serializeSaleTicket(saleTicket),
        afterData: this.serializeSaleTicket(updatedTicket),
        metadata: {
          inventoryMovements: inventoryMovements.map((movement) => ({
            id: movement.id,
            productId: movement.productId,
            quantity: movement.quantity.toString(),
            movementType: movement.movementType,
          })),
        },
      },
      tx,
    );

    return updatedTicket;
  }

  async void(
    ticketId: string,
    dto: VoidSaleTicketDto,
    voidedById: string,
  ): Promise<SaleTicketResponseDto> {
    const ticket = await this.runInTransaction(
      async (tx: SalesTransactionClient) => {
        const saleTicket = await this.getTicketOrThrow(ticketId, tx);
        this.assertExpectedVersion(saleTicket, dto.expectedVersion);
        this.ensureTicketStatus(
          saleTicket.status,
          SaleTicketStatus.CONFIRMED,
          'Only sale tickets in CONFIRMED status can be voided.',
        );

        this.ensureNoRecipeBasedItems(saleTicket.items);
        const inventoryItems = this.groupInventoryItems(saleTicket.items);

        const inventoryMovements = [];

        for (const item of inventoryItems) {
          const movement = await this.inventoryService.applyVoidReversal(
            {
              productId: item.productId,
              quantity: item.quantity,
              reason: dto.reason,
              referenceId: ticketId,
              createdById: voidedById,
            },
            tx,
          );

          inventoryMovements.push(movement);
        }

        await tx.saleTicket.update({
          where: { id: ticketId },
          data: {
            status: SaleTicketStatus.VOIDED,
            version: { increment: 1 },
            voidedById,
            voidedAt: new Date(),
            voidReason: dto.reason,
          },
        });

        const updatedTicket = await this.getTicketOrThrow(ticketId, tx);

        await this.emitOperationEvent(tx, updatedTicket);

        await this.auditService.log(
          {
            userId: voidedById,
            action: AuditAction.SALE_TICKET_VOIDED,
            entityType: AuditEntityType.SALE_TICKET,
            entityId: updatedTicket.id,
            beforeData: this.serializeSaleTicket(saleTicket),
            afterData: this.serializeSaleTicket(updatedTicket),
            metadata: {
              inventoryMovements: inventoryMovements.map((movement) => ({
                id: movement.id,
                productId: movement.productId,
                quantity: movement.quantity.toString(),
                movementType: movement.movementType,
              })),
              reason: dto.reason,
            },
          },
          tx,
        );

        return updatedTicket;
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
      'Only sale tickets in DRAFT status can be modified.',
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

  private async ensurePaymentBankActive(
    paymentBankId: string,
    tx?: SalesTransactionClient,
  ): Promise<{ id: string; name: string }> {
    const prisma = tx ?? this.prisma;
    const paymentBank = await prisma.paymentBank.findUnique({
      where: { id: paymentBankId },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    if (!paymentBank) {
      throw new NotFoundException(
        `Payment bank with id "${paymentBankId}" was not found.`,
      );
    }

    if (!paymentBank.active) {
      throw new ConflictException(
        'The provided payment bank is inactive and cannot receive transfer payments.',
      );
    }

    return {
      id: paymentBank.id,
      name: paymentBank.name,
    };
  }

  private async findProductSalesContext(
    tx: SalesTransactionClient,
    productId: string,
    salesChannelId: string,
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
        costHistory: {
          where: { validTo: null },
          orderBy: { validFrom: 'desc' },
          take: 1,
          select: { cost: true },
        },
        priceHistory: {
          where: {
            salesChannelId,
            validTo: null,
          },
          orderBy: { validFrom: 'desc' },
          take: 1,
          select: { price: true },
        },
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
        'RECIPE_BASED products cannot be added to sale tickets because recipe stock consumption is not implemented.',
      );
    }

    const [currentCost] = product.costHistory;

    if (!currentCost) {
      throw new NotFoundException(
        `Current cost for product with id "${productId}" was not found.`,
      );
    }

    const [currentPrice] = product.priceHistory;

    if (!currentPrice) {
      throw new NotFoundException(
        `Current price for product "${productId}" and sales channel "${salesChannelId}" was not found.`,
      );
    }

    return {
      product,
      currentCost,
      currentPrice,
    };
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
        version: { increment: 1 },
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

  private async resolvePaymentSelection(
    input: {
      paymentMethod?: SalePaymentMethod;
      paymentBankId?: string;
    },
    tx?: SalesTransactionClient,
    requireMethod = false,
  ): Promise<{
    paymentMethod: SalePaymentMethod | null;
    paymentBankId: string | null;
    paymentBankNameSnapshot: string | null;
  }> {
    if (!input.paymentMethod) {
      if (input.paymentBankId) {
        throw new ConflictException(
          'paymentBankId can only be provided when paymentMethod is TRANSFER.',
        );
      }

      if (requireMethod) {
        throw new ConflictException(
          'A sale ticket must define a paymentMethod before confirmation.',
        );
      }

      return {
        paymentMethod: null,
        paymentBankId: null,
        paymentBankNameSnapshot: null,
      };
    }

    if (input.paymentMethod === SalePaymentMethod.CASH) {
      if (input.paymentBankId) {
        throw new ConflictException(
          'CASH payments cannot include a paymentBankId.',
        );
      }

      return {
        paymentMethod: SalePaymentMethod.CASH,
        paymentBankId: null,
        paymentBankNameSnapshot: null,
      };
    }

    if (!input.paymentBankId) {
      throw new ConflictException(
        'TRANSFER payments require a valid paymentBankId.',
      );
    }

    const paymentBank = await this.ensurePaymentBankActive(
      input.paymentBankId,
      tx,
    );

    return {
      paymentMethod: SalePaymentMethod.TRANSFER,
      paymentBankId: paymentBank.id,
      paymentBankNameSnapshot: paymentBank.name,
    };
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
        'RECIPE_BASED products cannot be confirmed or voided because recipe stock consumption is not implemented.',
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
    const hasInactiveProduct = items.some(
      (item) => item.product.active === false,
    );

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
      if (
        item.product.stockManagementType !==
        StockManagementType.FINISHED_PRODUCT
      ) {
        continue;
      }

      grouped.set(
        item.productId,
        (grouped.get(item.productId) ?? new Decimal(0)).add(item.quantity),
      );
    }

    return Array.from(grouped.entries())
      .sort(([leftProductId], [rightProductId]) =>
        leftProductId.localeCompare(rightProductId),
      )
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
  }

  private serializeSaleTicketItem(item: {
    id: string;
    ticketId: string;
    productId: string;
    productNameSnapshot?: string;
    productSkuSnapshot?: string | null;
    productUnitSnapshot?: string;
    quantity: Decimal;
    unitPriceSnapshot: Decimal;
    unitCostSnapshot?: Decimal;
    subtotal?: Decimal;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: item.id,
      ticketId: item.ticketId,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot ?? null,
      productSkuSnapshot: item.productSkuSnapshot ?? null,
      productUnitSnapshot: item.productUnitSnapshot ?? null,
      quantity: item.quantity?.toString?.() ?? null,
      unitPriceSnapshot: item.unitPriceSnapshot?.toString?.() ?? null,
      unitCostSnapshot: item.unitCostSnapshot?.toString() ?? null,
      subtotal: item.subtotal?.toString() ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
    };
  }

  private serializeSaleTicket(
    ticket: Partial<Parameters<typeof toSaleTicketResponse>[0]>,
  ) {
    return {
      id: ticket.id ?? null,
      ticketNumber: ticket.ticketNumber ?? null,
      salesChannelId: ticket.salesChannelId ?? null,
      status: ticket.status ?? null,
      paymentMethod: ticket.paymentMethod ?? null,
      paymentBankId: ticket.paymentBankId ?? null,
      paymentBankNameSnapshot: ticket.paymentBankNameSnapshot ?? null,
      subtotal:
        ticket.subtotal instanceof Decimal ? ticket.subtotal.toString() : null,
      discountTotal:
        ticket.discountTotal instanceof Decimal
          ? ticket.discountTotal.toString()
          : null,
      commissionTotal:
        ticket.commissionTotal instanceof Decimal
          ? ticket.commissionTotal.toString()
          : null,
      total: ticket.total instanceof Decimal ? ticket.total.toString() : null,
      notes: ticket.notes ?? null,
      createdById: ticket.createdById ?? null,
      confirmedById: ticket.confirmedById ?? null,
      cancelledById: ticket.cancelledById ?? null,
      voidedById: ticket.voidedById ?? null,
      cancellationReason: ticket.cancellationReason ?? null,
      voidReason: ticket.voidReason ?? null,
      createdAt: ticket.createdAt ?? null,
      updatedAt: ticket.updatedAt ?? null,
      confirmedAt: ticket.confirmedAt ?? null,
      cancelledAt: ticket.cancelledAt ?? null,
      voidedAt: ticket.voidedAt ?? null,
    };
  }

  private assertExpectedVersion(
    entity: { id: string; version?: bigint },
    expectedVersion: string | undefined,
  ): void {
    if (!expectedVersion) {
      if (this.configService.get<boolean>('OPTIMISTIC_VERSIONING')) {
        throw new BadRequestException('expectedVersion is required.');
      }
      return;
    }

    const currentVersion = entity.version ?? 1n;
    if (currentVersion !== BigInt(expectedVersion)) {
      throw new ConflictException({
        code: 'STALE_VERSION',
        entityType: 'SaleTicket',
        entityId: entity.id,
        currentVersion: currentVersion.toString(),
      });
    }
  }

  private async emitOperationEvent(
    tx: SalesTransactionClient,
    ticket: { id: string; version?: bigint },
  ): Promise<void> {
    if (!this.configService.get<boolean>('OPERATIONS_SSE')) return;
    const event = await tx.operationEvent.create({
      data: {
        type: 'sale-ticket.changed',
        entityType: 'SaleTicket',
        entityId: ticket.id,
        version: ticket.version ?? 1n,
      },
    });
    await tx.$executeRaw`SELECT pg_notify('operation_events', ${event.id.toString()})`;
  }

  private runInTransaction<T>(
    callback: (tx: SalesTransactionClient) => Promise<T>,
  ): Promise<T> {
    return runSerializableTransaction(this.prisma, callback);
  }
}
