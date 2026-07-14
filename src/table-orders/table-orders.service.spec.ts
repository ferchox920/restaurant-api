import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { SalesService } from '../sales/sales.service';
import { TableOrdersService } from './table-orders.service';

describe('TableOrdersService', () => {
  let service: TableOrdersService;
  let prismaService: {
    $transaction: jest.Mock;
    restaurantTable: {
      findUnique: jest.Mock;
    };
    tableOrder: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let salesService: {
    createDraftInTransaction: jest.Mock;
    cancelDraftInTransaction: jest.Mock;
    confirmDraftInTransaction: jest.Mock;
    addItem: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
  };
  let auditService: {
    log: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(async (callback) => callback(prismaService)),
      restaurantTable: {
        findUnique: jest.fn(),
      },
      tableOrder: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    salesService = {
      createDraftInTransaction: jest.fn(),
      cancelDraftInTransaction: jest.fn(),
      confirmDraftInTransaction: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new TableOrdersService(
      prismaService as unknown as PrismaService,
      salesService as unknown as SalesService,
      auditService as unknown as AuditService,
    );
  });

  function makeSaleTicket(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ticket-1',
      ticketNumber: 1001,
      salesChannelId: 'channel-1',
      status: 'DRAFT',
      paymentMethod: null,
      paymentBankId: null,
      paymentBankNameSnapshot: null,
      subtotal: new Decimal('0'),
      discountTotal: new Decimal('0'),
      commissionTotal: new Decimal('0'),
      total: new Decimal('0'),
      notes: null,
      createdById: 'cashier-1',
      confirmedById: null,
      cancelledById: null,
      voidedById: null,
      cancellationReason: null,
      voidReason: null,
      createdAt: new Date('2026-06-30T18:00:00.000Z'),
      updatedAt: new Date('2026-06-30T18:00:00.000Z'),
      confirmedAt: null,
      cancelledAt: null,
      voidedAt: null,
      salesChannel: { name: 'Salon' },
      paymentBank: null,
      items: [],
      ...overrides,
    };
  }

  function makeOrder(overrides: Record<string, unknown> = {}) {
    return {
      id: 'order-1',
      restaurantTableId: 'table-1',
      saleTicketId: 'ticket-1',
      status: 'OPEN',
      openedById: 'cashier-1',
      cancelledById: null,
      closedById: null,
      notes: 'Mesa 1',
      cancelReason: null,
      openedAt: new Date('2026-06-30T18:00:00.000Z'),
      cancelledAt: null,
      closedAt: null,
      createdAt: new Date('2026-06-30T18:00:00.000Z'),
      updatedAt: new Date('2026-06-30T18:00:00.000Z'),
      restaurantTable: {
        code: 'M01',
        name: 'Mesa 1',
        area: 'Salon',
      },
      saleTicket: makeSaleTicket(),
      ...overrides,
    };
  }

  it('opens an order for an active table and creates a draft sale ticket', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce({
      id: 'table-1',
      active: true,
    });
    prismaService.tableOrder.findFirst.mockResolvedValueOnce(null);
    salesService.createDraftInTransaction.mockResolvedValueOnce({
      id: 'ticket-1',
    });
    prismaService.tableOrder.create.mockResolvedValueOnce(makeOrder());

    const result = await service.open(
      'table-1',
      { salesChannelId: 'channel-1', notes: 'Mesa 1' },
      'cashier-1',
    );

    expect(salesService.createDraftInTransaction).toHaveBeenCalledWith(
      {
        salesChannelId: 'channel-1',
        notes: 'Mesa 1',
      },
      'cashier-1',
      prismaService,
    );
    expect(prismaService.tableOrder.create).toHaveBeenCalledWith({
      data: {
        restaurantTableId: 'table-1',
        saleTicketId: 'ticket-1',
        status: 'OPEN',
        openedById: 'cashier-1',
        notes: 'Mesa 1',
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe('OPEN');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.TABLE_ORDER_OPENED,
        entityType: AuditEntityType.TABLE_ORDER,
        entityId: 'order-1',
      }),
      prismaService,
    );
  });

  it('rejects opening when the table does not exist', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.open(
        'missing-table',
        { salesChannelId: 'channel-1' },
        'cashier-1',
      ),
    ).rejects.toThrow(NotFoundException);
    expect(salesService.createDraftInTransaction).not.toHaveBeenCalled();
  });

  it('rejects opening when the table is inactive', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce({
      id: 'table-1',
      active: false,
    });

    await expect(
      service.open('table-1', { salesChannelId: 'channel-1' }, 'cashier-1'),
    ).rejects.toThrow(ConflictException);
    expect(salesService.createDraftInTransaction).not.toHaveBeenCalled();
  });

  it('rejects opening when the table already has an open order', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce({
      id: 'table-1',
      active: true,
    });
    prismaService.tableOrder.findFirst.mockResolvedValueOnce({ id: 'order-1' });

    await expect(
      service.open('table-1', { salesChannelId: 'channel-1' }, 'cashier-1'),
    ).rejects.toThrow(ConflictException);
    expect(salesService.createDraftInTransaction).not.toHaveBeenCalled();
  });

  it('maps unique constraint races to conflict when opening', async () => {
    const error = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );
    prismaService.$transaction.mockRejectedValueOnce(error);

    await expect(
      service.open('table-1', { salesChannelId: 'channel-1' }, 'cashier-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('gets the current open order for a table', async () => {
    prismaService.tableOrder.findFirst.mockResolvedValueOnce(makeOrder());

    const result = await service.findCurrentByTable('table-1');

    expect(prismaService.tableOrder.findFirst).toHaveBeenCalledWith({
      where: {
        restaurantTableId: 'table-1',
        status: 'OPEN',
      },
      include: expect.any(Object),
    });
    expect(result.id).toBe('order-1');
  });

  it('lists table orders using filters', async () => {
    const from = new Date('2026-06-30T00:00:00.000Z');
    const to = new Date('2026-06-30T23:59:59.999Z');
    prismaService.tableOrder.findMany.mockResolvedValueOnce([makeOrder()]);

    const result = await service.findAll({
      status: 'OPEN',
      tableId: 'table-1',
      openedById: 'cashier-1',
      from,
      to,
    });

    expect(prismaService.tableOrder.findMany).toHaveBeenCalledWith({
      where: {
        status: 'OPEN',
        restaurantTableId: 'table-1',
        openedById: 'cashier-1',
        openedAt: {
          gte: from,
          lte: to,
        },
      },
      include: expect.any(Object),
      orderBy: {
        openedAt: 'desc',
      },
    });
    expect(result).toHaveLength(1);
  });

  it('cancels an open order and cancels the associated draft ticket', async () => {
    prismaService.tableOrder.findUnique.mockResolvedValueOnce(makeOrder());
    prismaService.tableOrder.update.mockResolvedValueOnce(
      makeOrder({
        status: 'CANCELLED',
        cancelledById: 'cashier-1',
        cancelReason: 'Cliente se retiro',
        cancelledAt: new Date('2026-06-30T18:20:00.000Z'),
        saleTicket: makeSaleTicket({ status: 'CANCELLED' }),
      }),
    );

    const result = await service.cancel(
      'order-1',
      { reason: 'Cliente se retiro' },
      'cashier-1',
    );

    expect(salesService.cancelDraftInTransaction).toHaveBeenCalledWith(
      'ticket-1',
      { reason: 'Cliente se retiro' },
      'cashier-1',
      prismaService,
    );
    expect(result.status).toBe('CANCELLED');
    expect(result.cancelReason).toBe('Cliente se retiro');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.TABLE_ORDER_CANCELLED,
        entityType: AuditEntityType.TABLE_ORDER,
        metadata: {
          saleTicketId: 'ticket-1',
          reason: 'Cliente se retiro',
        },
      }),
      prismaService,
    );
  });

  it.each(['CANCELLED', 'CLOSED'])(
    'rejects cancelling table orders in %s status',
    async (status) => {
      prismaService.tableOrder.findUnique.mockResolvedValueOnce(
        makeOrder({ status }),
      );

      await expect(
        service.cancel('order-1', { reason: 'x' }, 'cashier-1'),
      ).rejects.toThrow(ConflictException);
      expect(salesService.cancelDraftInTransaction).not.toHaveBeenCalled();
    },
  );

  it('adds items through the associated draft sale ticket', async () => {
    prismaService.tableOrder.findUnique
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder());

    const result = await service.addItem(
      'order-1',
      { productId: 'product-1', quantity: 2 },
      'cashier-1',
    );

    expect(salesService.addItem).toHaveBeenCalledWith(
      'ticket-1',
      { productId: 'product-1', quantity: 2 },
      'cashier-1',
    );
    expect(result.id).toBe('order-1');
  });

  it('updates items through the associated draft sale ticket', async () => {
    prismaService.tableOrder.findUnique
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder());

    await service.updateItem('order-1', 'item-1', { quantity: 3 }, 'cashier-1');

    expect(salesService.updateItem).toHaveBeenCalledWith(
      'ticket-1',
      'item-1',
      { quantity: 3 },
      'cashier-1',
    );
  });

  it('removes items through the associated draft sale ticket', async () => {
    prismaService.tableOrder.findUnique
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder());

    await service.removeItem('order-1', 'item-1', 'cashier-1');

    expect(salesService.removeItem).toHaveBeenCalledWith(
      'ticket-1',
      'item-1',
      'cashier-1',
    );
  });

  it.each(['CANCELLED', 'CLOSED'])(
    'rejects item changes when table order is %s',
    async (status) => {
      prismaService.tableOrder.findUnique.mockResolvedValueOnce(
        makeOrder({ status }),
      );

      await expect(
        service.addItem(
          'order-1',
          { productId: 'product-1', quantity: 1 },
          'cashier-1',
        ),
      ).rejects.toThrow(ConflictException);
      expect(salesService.addItem).not.toHaveBeenCalled();
    },
  );

  it('closes an open order and confirms the associated draft sale ticket', async () => {
    prismaService.tableOrder.findUnique.mockResolvedValueOnce(makeOrder());
    salesService.confirmDraftInTransaction.mockResolvedValueOnce(
      makeSaleTicket({ status: 'CONFIRMED' }),
    );
    prismaService.tableOrder.update.mockResolvedValueOnce(
      makeOrder({
        status: 'CLOSED',
        closedById: 'cashier-1',
        closedAt: new Date('2026-06-30T19:00:00.000Z'),
        saleTicket: makeSaleTicket({ status: 'CONFIRMED' }),
      }),
    );

    const result = await service.close(
      'order-1',
      { paymentMethod: 'CASH' },
      'cashier-1',
    );

    expect(salesService.confirmDraftInTransaction).toHaveBeenCalledWith(
      'ticket-1',
      { paymentMethod: 'CASH' },
      'cashier-1',
      prismaService,
    );
    expect(prismaService.tableOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: 'CLOSED',
        closedById: 'cashier-1',
        closedAt: expect.any(Date),
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe('CLOSED');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TABLE_ORDER_CLOSED',
        entityType: AuditEntityType.TABLE_ORDER,
        metadata: {
          saleTicketId: 'ticket-1',
        },
      }),
      prismaService,
    );
  });

  it.each(['CANCELLED', 'CLOSED'])(
    'rejects closing table orders in %s status',
    async (status) => {
      prismaService.tableOrder.findUnique.mockResolvedValueOnce(
        makeOrder({ status }),
      );

      await expect(
        service.close('order-1', { paymentMethod: 'CASH' }, 'cashier-1'),
      ).rejects.toThrow(ConflictException);
      expect(salesService.confirmDraftInTransaction).not.toHaveBeenCalled();
    },
  );
});
