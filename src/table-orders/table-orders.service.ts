import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { runSerializableTransaction } from '../database/transaction';
import { AddSaleTicketItemDto } from '../sales/dto/add-sale-ticket-item.dto';
import { ConfirmSaleTicketDto } from '../sales/dto/confirm-sale-ticket.dto';
import { UpdateSaleTicketItemDto } from '../sales/dto/update-sale-ticket-item.dto';
import { SalesService } from '../sales/sales.service';
import { CancelTableOrderDto } from './dto/cancel-table-order.dto';
import { OpenTableOrderDto } from './dto/open-table-order.dto';
import { TableOrderQueryDto } from './dto/table-order-query.dto';
import { TableOrderResponseDto } from './dto/table-order-response.dto';
import { toTableOrderResponse } from './table-order-response.mapper';
import { TableOrderStatus } from './table-orders.enums';

type TableOrdersTransactionClient = Prisma.TransactionClient;

const tableOrderInclude = {
  restaurantTable: {
    select: {
      code: true,
      name: true,
      area: true,
    },
  },
  saleTicket: {
    include: {
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
      },
    },
  },
} satisfies Prisma.TableOrderInclude;

@Injectable()
export class TableOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
    private readonly configService: ConfigService = {
      get: () => false,
    } as unknown as ConfigService,
  ) {}

  async open(
    restaurantTableId: string,
    dto: OpenTableOrderDto,
    openedById: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.runInTransaction(
      async (tx: TableOrdersTransactionClient) => {
        await this.ensureTableCanOpenOrder(restaurantTableId, tx);
        await this.ensureTableHasNoOpenOrder(restaurantTableId, tx);

        const saleTicket = await this.salesService.createDraftInTransaction(
          {
            salesChannelId: dto.salesChannelId,
            notes: dto.notes,
          },
          openedById,
          tx,
        );

        const createdOrder = await tx.tableOrder.create({
          data: {
            restaurantTableId,
            saleTicketId: saleTicket.id,
            status: TableOrderStatus.OPEN,
            openedById,
            notes: dto.notes ?? null,
          },
          include: tableOrderInclude,
        });

        await this.emitOperationEvent(tx, createdOrder);

        await this.auditService.log(
          {
            userId: openedById,
            action: AuditAction.TABLE_ORDER_OPENED,
            entityType: AuditEntityType.TABLE_ORDER,
            entityId: createdOrder.id,
            beforeData: null,
            afterData: this.serializeTableOrder(createdOrder),
            metadata: {
              restaurantTableId,
              saleTicketId: saleTicket.id,
            },
          },
          tx,
        );

        return createdOrder;
      },
    );

    return toTableOrderResponse(order);
  }

  async findAll(query: TableOrderQueryDto): Promise<TableOrderResponseDto[]> {
    const orders = await this.prisma.tableOrder.findMany({
      where: {
        status: query.status,
        restaurantTableId: query.tableId,
        openedById: query.openedById,
        openedAt:
          query.from || query.to
            ? {
                gte: query.from,
                lte: query.to,
              }
            : undefined,
      },
      include: tableOrderInclude,
      orderBy: {
        openedAt: 'desc',
      },
      ...(query.limit !== undefined ? { take: query.limit } : {}),
      ...(query.offset !== undefined ? { skip: query.offset } : {}),
    });

    return orders.map(toTableOrderResponse);
  }

  async findCurrentByTable(
    restaurantTableId: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.prisma.tableOrder.findFirst({
      where: {
        restaurantTableId,
        status: TableOrderStatus.OPEN,
      },
      include: tableOrderInclude,
    });

    if (!order) {
      throw new NotFoundException(
        `Open table order for restaurant table "${restaurantTableId}" was not found.`,
      );
    }

    return toTableOrderResponse(order);
  }

  async findOne(id: string): Promise<TableOrderResponseDto> {
    const order = await this.getOrderOrThrow(id);
    return toTableOrderResponse(order);
  }

  async cancel(
    id: string,
    dto: CancelTableOrderDto,
    cancelledById: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.runInTransaction(
      async (tx: TableOrdersTransactionClient) => {
        const existingOrder = await this.getOrderOrThrow(id, tx);
        this.assertExpectedVersion(existingOrder, dto.expectedVersion);
        this.ensureOrderStatus(existingOrder.status, TableOrderStatus.OPEN);

        await this.salesService.cancelDraftInTransaction(
          existingOrder.saleTicketId,
          {
            reason: dto.reason,
            ...(dto.expectedVersion
              ? {
                  expectedVersion: (
                    existingOrder.saleTicket.version ?? 1n
                  ).toString(),
                }
              : {}),
          },
          cancelledById,
          tx,
        );

        const updatedOrder = await tx.tableOrder.update({
          where: { id },
          data: {
            status: TableOrderStatus.CANCELLED,
            ...(dto.expectedVersion ||
            this.configService.get<boolean>('OPTIMISTIC_VERSIONING')
              ? { version: { increment: 1 } }
              : {}),
            cancelledById,
            cancelledAt: new Date(),
            cancelReason: dto.reason,
          },
          include: tableOrderInclude,
        });

        await this.emitOperationEvent(tx, updatedOrder);

        await this.auditService.log(
          {
            userId: cancelledById,
            action: AuditAction.TABLE_ORDER_CANCELLED,
            entityType: AuditEntityType.TABLE_ORDER,
            entityId: updatedOrder.id,
            beforeData: this.serializeTableOrder(existingOrder),
            afterData: this.serializeTableOrder(updatedOrder),
            metadata: {
              saleTicketId: existingOrder.saleTicketId,
              reason: dto.reason,
            },
          },
          tx,
        );

        return updatedOrder;
      },
    );

    return toTableOrderResponse(order);
  }

  async addItem(
    id: string,
    dto: AddSaleTicketItemDto,
    actorUserId: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.getOpenOrderOrThrow(id);
    this.assertExpectedVersion(order, dto.expectedVersion);
    await this.salesService.addItem(
      order.saleTicketId,
      {
        ...dto,
        ...(dto.expectedVersion
          ? { expectedVersion: (order.saleTicket.version ?? 1n).toString() }
          : {}),
      },
      actorUserId,
    );
    await this.prisma.tableOrder.update({
      where: { id },
      data: { version: { increment: 1 } },
    });

    return this.findOne(id);
  }

  async updateItem(
    id: string,
    itemId: string,
    dto: UpdateSaleTicketItemDto,
    actorUserId: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.getOpenOrderOrThrow(id);
    this.assertExpectedVersion(order, dto.expectedVersion);
    await this.salesService.updateItem(
      order.saleTicketId,
      itemId,
      {
        ...dto,
        ...(dto.expectedVersion
          ? { expectedVersion: (order.saleTicket.version ?? 1n).toString() }
          : {}),
      },
      actorUserId,
    );
    await this.prisma.tableOrder.update({
      where: { id },
      data: { version: { increment: 1 } },
    });

    return this.findOne(id);
  }

  async removeItem(
    id: string,
    itemId: string,
    actorUserId: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.getOpenOrderOrThrow(id);
    await this.salesService.removeItem(order.saleTicketId, itemId, actorUserId);

    return this.findOne(id);
  }

  async close(
    id: string,
    dto: ConfirmSaleTicketDto,
    closedById: string,
  ): Promise<TableOrderResponseDto> {
    const order = await this.runInTransaction(
      async (tx: TableOrdersTransactionClient) => {
        const existingOrder = await this.getOrderOrThrow(id, tx);
        this.assertExpectedVersion(existingOrder, dto.expectedVersion);
        this.ensureOrderStatus(existingOrder.status, TableOrderStatus.OPEN);

        await this.salesService.confirmDraftInTransaction(
          existingOrder.saleTicketId,
          {
            ...dto,
            ...(dto.expectedVersion
              ? {
                  expectedVersion: (
                    existingOrder.saleTicket.version ?? 1n
                  ).toString(),
                }
              : {}),
          },
          closedById,
          tx,
        );

        const updatedOrder = await tx.tableOrder.update({
          where: { id },
          data: {
            status: TableOrderStatus.CLOSED,
            ...(dto.expectedVersion ||
            this.configService.get<boolean>('OPTIMISTIC_VERSIONING')
              ? { version: { increment: 1 } }
              : {}),
            closedById,
            closedAt: new Date(),
          },
          include: tableOrderInclude,
        });

        await this.emitOperationEvent(tx, updatedOrder);

        await this.auditService.log(
          {
            userId: closedById,
            action: AuditAction.TABLE_ORDER_CLOSED,
            entityType: AuditEntityType.TABLE_ORDER,
            entityId: updatedOrder.id,
            beforeData: this.serializeTableOrder(existingOrder),
            afterData: this.serializeTableOrder(updatedOrder),
            metadata: {
              saleTicketId: existingOrder.saleTicketId,
            },
          },
          tx,
        );

        return updatedOrder;
      },
    );

    return toTableOrderResponse(order);
  }

  private async ensureTableCanOpenOrder(
    restaurantTableId: string,
    tx: TableOrdersTransactionClient,
  ): Promise<void> {
    const table = await tx.restaurantTable.findUnique({
      where: { id: restaurantTableId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!table) {
      throw new NotFoundException(
        `Restaurant table with id "${restaurantTableId}" was not found.`,
      );
    }

    if (!table.active) {
      throw new ConflictException(
        'Inactive restaurant tables cannot receive table orders.',
      );
    }
  }

  private async ensureTableHasNoOpenOrder(
    restaurantTableId: string,
    tx: TableOrdersTransactionClient,
  ): Promise<void> {
    const openOrder = await tx.tableOrder.findFirst({
      where: {
        restaurantTableId,
        status: TableOrderStatus.OPEN,
      },
      select: { id: true },
    });

    if (openOrder) {
      throw new ConflictException(
        'A restaurant table can only have one open table order.',
      );
    }
  }

  private async getOrderOrThrow(id: string, tx?: TableOrdersTransactionClient) {
    const prisma = tx ?? this.prisma;
    const order = await prisma.tableOrder.findUnique({
      where: { id },
      include: tableOrderInclude,
    });

    if (!order) {
      throw new NotFoundException(`Table order with id "${id}" was not found.`);
    }

    return order;
  }

  private async getOpenOrderOrThrow(id: string) {
    const order = await this.getOrderOrThrow(id);
    this.ensureOrderStatus(order.status, TableOrderStatus.OPEN);

    return order;
  }

  private ensureOrderStatus(
    currentStatus: string,
    expectedStatus: string,
  ): void {
    if (currentStatus !== expectedStatus) {
      throw new ConflictException(
        `Only table orders in ${expectedStatus} status can perform this operation.`,
      );
    }
  }

  private serializeTableOrder(
    order: Awaited<ReturnType<TableOrdersService['getOrderOrThrow']>>,
  ) {
    return {
      id: order.id,
      restaurantTableId: order.restaurantTableId,
      saleTicketId: order.saleTicketId,
      status: order.status,
      openedById: order.openedById,
      cancelledById: order.cancelledById,
      closedById: order.closedById,
      notes: order.notes,
      cancelReason: order.cancelReason,
      openedAt: order.openedAt,
      cancelledAt: order.cancelledAt,
      closedAt: order.closedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private assertExpectedVersion(
    order: { id: string; version?: bigint },
    expectedVersion: string | undefined,
  ): void {
    if (!expectedVersion) {
      if (this.configService.get<boolean>('OPTIMISTIC_VERSIONING')) {
        throw new BadRequestException('expectedVersion is required.');
      }
      return;
    }
    const currentVersion = order.version ?? 1n;
    if (currentVersion !== BigInt(expectedVersion)) {
      throw new ConflictException({
        code: 'STALE_VERSION',
        entityType: 'TableOrder',
        entityId: order.id,
        currentVersion: currentVersion.toString(),
      });
    }
  }

  private async emitOperationEvent(
    tx: TableOrdersTransactionClient,
    order: {
      id: string;
      version?: bigint;
      restaurantTableId: string;
      saleTicketId: string;
    },
  ): Promise<void> {
    if (!this.configService.get<boolean>('OPERATIONS_SSE')) return;
    const event = await tx.operationEvent.create({
      data: {
        type: 'table-order.changed',
        entityType: 'TableOrder',
        entityId: order.id,
        version: order.version ?? 1n,
        related: {
          restaurantTableId: order.restaurantTableId,
          saleTicketId: order.saleTicketId,
        },
      },
    });
    await tx.$executeRaw`SELECT pg_notify('operation_events', ${event.id.toString()})`;
  }

  private runInTransaction<T>(
    callback: (tx: TableOrdersTransactionClient) => Promise<T>,
  ): Promise<T> {
    return runSerializableTransaction(this.prisma, callback).catch((error) => {
      this.handleOpenOrderConflict(error);
      throw error;
    });
  }

  private handleOpenOrderConflict(error: unknown): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A restaurant table can only have one open table order.',
      );
    }
  }
}
