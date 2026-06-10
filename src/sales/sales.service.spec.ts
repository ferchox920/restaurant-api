import { ConflictException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockManagementType } from '../products/product.enums';
import { SalesService } from './sales.service';

type TxMock = {
  salesChannel: {
    findUnique: jest.Mock;
  };
  saleTicket: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  saleTicketItem: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    aggregate: jest.Mock;
  };
  product: {
    findUnique: jest.Mock;
  };
  productCostHistory: {
    findFirst: jest.Mock;
  };
  productPriceHistory: {
    findFirst: jest.Mock;
  };
  productStock?: {
    update: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
  };
  inventoryMovement?: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
};

describe('SalesService', () => {
  let service: SalesService;
  let inventoryService: {
    applySaleOut: jest.Mock;
    applyVoidReversal: jest.Mock;
  };
  let prismaService: {
    $transaction: jest.Mock;
    salesChannel: {
      findUnique: jest.Mock;
    };
    saleTicket: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    productStock: {
      update: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    inventoryMovement: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      salesChannel: {
        findUnique: jest.fn(),
      },
      saleTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      productStock: {
        update: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    inventoryService = {
      applySaleOut: jest.fn(),
      applyVoidReversal: jest.fn(),
    };

    service = new SalesService(
      prismaService as unknown as PrismaService,
      inventoryService as unknown as InventoryService,
    );
  });

  function makeTicketRecord(
    overrides: Partial<Record<string, unknown>> = {},
    itemOverrides: Array<Record<string, unknown>> = [],
  ) {
    return {
      id: 'ticket-1',
      ticketNumber: 1001,
      salesChannelId: 'channel-1',
      status: 'DRAFT',
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
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      updatedAt: new Date('2026-06-09T03:05:00.000Z'),
      confirmedAt: null,
      cancelledAt: null,
      voidedAt: null,
      salesChannel: { name: 'Salon', active: true },
      items: itemOverrides,
      ...overrides,
    };
  }

  function makeSaleItem(
    overrides: Partial<Record<string, unknown>> = {},
  ): Record<string, unknown> {
    return {
      id: 'item-1',
      ticketId: 'ticket-1',
      productId: 'product-1',
      productNameSnapshot: 'Hamburguesa clasica',
      productSkuSnapshot: 'BURGER-001',
      productUnitSnapshot: 'UNIT',
      quantity: new Decimal('2'),
      unitPriceSnapshot: new Decimal('5999.99'),
      unitCostSnapshot: new Decimal('2500'),
      subtotal: new Decimal('11999.98'),
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      updatedAt: new Date('2026-06-09T03:05:00.000Z'),
      product: {
        active: true,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
      },
      ...overrides,
    };
  }

  function makeDraftTx(overrides: Partial<TxMock> = {}): TxMock {
    return {
      salesChannel: {
        findUnique: jest.fn(),
      },
      saleTicket: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'ticket-1',
          salesChannelId: 'channel-1',
          status: 'DRAFT',
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      saleTicketItem: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { subtotal: new Decimal('0') },
        }),
      },
      product: {
        findUnique: jest.fn(),
      },
      productCostHistory: {
        findFirst: jest.fn(),
      },
      productPriceHistory: {
        findFirst: jest.fn(),
      },
      productStock: {
        update: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      ...overrides,
    };
  }

  it('creates a draft sale ticket for an active sales channel', async () => {
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: true,
    });
    prismaService.saleTicket.create.mockResolvedValueOnce(
      makeTicketRecord({
        notes: 'Mesa 4',
      }),
    );

    const result = await service.create(
      { salesChannelId: 'channel-1', notes: 'Mesa 4' },
      'cashier-1',
    );

    expect(prismaService.saleTicket.create).toHaveBeenCalledWith({
      data: {
        salesChannelId: 'channel-1',
        notes: 'Mesa 4',
        createdById: 'cashier-1',
        status: 'DRAFT',
        subtotal: expect.any(Decimal),
        discountTotal: expect.any(Decimal),
        commissionTotal: expect.any(Decimal),
        total: expect.any(Decimal),
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe('DRAFT');
    expect(result.createdById).toBe('cashier-1');
    expect(result.subtotal).toBe('0');
    expect(result.total).toBe('0');
  });

  it('rejects ticket creation for nonexistent sales channels', async () => {
    prismaService.salesChannel.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({ salesChannelId: 'missing-channel' }, 'cashier-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects ticket creation for inactive sales channels', async () => {
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: false,
    });

    await expect(
      service.create({ salesChannelId: 'channel-1' }, 'cashier-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('lists tickets using filters and numeric search', async () => {
    prismaService.saleTicket.findMany.mockResolvedValueOnce([]);

    const from = new Date('2026-06-09T00:00:00.000Z');
    const to = new Date('2026-06-10T00:00:00.000Z');
    await service.findAll({
      status: 'DRAFT',
      salesChannelId: 'channel-1',
      createdById: 'cashier-1',
      from,
      to,
      search: '1001',
    });

    expect(prismaService.saleTicket.findMany).toHaveBeenCalledWith({
      where: {
        status: 'DRAFT',
        salesChannelId: 'channel-1',
        createdById: 'cashier-1',
        createdAt: {
          gte: from,
          lte: to,
        },
        OR: [
          { ticketNumber: 1001 },
          { notes: { contains: '1001', mode: 'insensitive' } },
        ],
      },
      include: expect.any(Object),
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('gets one ticket with items', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce(
      makeTicketRecord(
        {
          subtotal: new Decimal('11999.98'),
          total: new Decimal('11999.98'),
        },
        [
          {
            id: 'item-1',
            ticketId: 'ticket-1',
            productId: 'product-1',
            productNameSnapshot: 'Hamburguesa clasica',
            productSkuSnapshot: 'BURGER-001',
            productUnitSnapshot: 'UNIT',
            quantity: new Decimal('2'),
            unitPriceSnapshot: new Decimal('5999.99'),
            unitCostSnapshot: new Decimal('2500'),
            subtotal: new Decimal('11999.98'),
            createdAt: new Date('2026-06-09T03:00:00.000Z'),
            updatedAt: new Date('2026-06-09T03:05:00.000Z'),
          },
        ],
      ),
    );

    const result = await service.findOne('ticket-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productNameSnapshot).toBe('Hamburguesa clasica');
  });

  it('updates notes when the ticket is in DRAFT', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      status: 'DRAFT',
    });
    prismaService.saleTicket.update.mockResolvedValueOnce(
      makeTicketRecord({
        notes: 'Cliente pide sin cebolla',
      }),
    );

    const result = await service.update('ticket-1', {
      notes: 'Cliente pide sin cebolla',
    });

    expect(result.notes).toBe('Cliente pide sin cebolla');
  });

  it('rejects modifications on cancelled tickets', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      status: 'CANCELLED',
    });

    await expect(service.update('ticket-1', { notes: 'x' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects confirmed tickets for mutation', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      status: 'CONFIRMED',
    });

    await expect(service.update('ticket-1', { notes: 'x' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects voided tickets for mutation', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      status: 'VOIDED',
    });

    await expect(
      service.cancel('ticket-1', { reason: 'x' }, 'cashier-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('cancels a draft ticket and stores cancellation metadata', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      status: 'DRAFT',
    });
    prismaService.saleTicket.update.mockResolvedValueOnce(
      makeTicketRecord({
        status: 'CANCELLED',
        cancelledById: 'cashier-1',
        cancellationReason: 'Cliente desistio',
        cancelledAt: new Date('2026-06-09T03:10:00.000Z'),
      }),
    );

    const result = await service.cancel(
      'ticket-1',
      { reason: 'Cliente desistio' },
      'cashier-1',
    );

    expect(result.status).toBe('CANCELLED');
    expect(result.cancelledById).toBe('cashier-1');
    expect(result.cancellationReason).toBe('Cliente desistio');
    expect(result.cancelledAt).toEqual(new Date('2026-06-09T03:10:00.000Z'));
  });

  it('does not touch inventory state when cancelling a draft ticket', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      status: 'DRAFT',
    });
    prismaService.saleTicket.update.mockResolvedValueOnce(
      makeTicketRecord({
        status: 'CANCELLED',
        cancelledById: 'cashier-1',
        cancellationReason: 'Cliente desistio',
        cancelledAt: new Date('2026-06-09T03:10:00.000Z'),
      }),
    );

    await service.cancel('ticket-1', { reason: 'Cliente desistio' }, 'cashier-1');

    expect(inventoryService.applySaleOut).not.toHaveBeenCalled();
    expect(inventoryService.applyVoidReversal).not.toHaveBeenCalled();
  });

  it('confirms a draft ticket, delegates stock movement and stores confirmation metadata', async () => {
    const tx = makeDraftTx({
      salesChannel: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'channel-1',
          active: true,
        }),
      },
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(makeTicketRecord({}, [makeSaleItem()]))
          .mockResolvedValueOnce(
            makeTicketRecord(
              {
                status: 'CONFIRMED',
                confirmedById: 'cashier-1',
                confirmedAt: new Date('2026-06-09T03:06:00.000Z'),
              },
              [makeSaleItem()],
            ),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.confirm('ticket-1', {}, 'cashier-1');

    expect(inventoryService.applySaleOut).toHaveBeenCalledWith(
      {
        productId: 'product-1',
        quantity: new Decimal('2'),
        reason: 'Sale ticket ticket-1 confirmation.',
        referenceId: 'ticket-1',
        createdById: 'cashier-1',
      },
      tx,
    );
    expect(result.status).toBe('CONFIRMED');
    expect(result.confirmedById).toBe('cashier-1');
  });

  it('rejects confirmation when a draft ticket has no items', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest.fn().mockResolvedValueOnce(makeTicketRecord()),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(service.confirm('ticket-1', {}, 'cashier-1')).rejects.toThrow(
      ConflictException,
    );
    expect(inventoryService.applySaleOut).not.toHaveBeenCalled();
  });

  it('rejects confirmation for nonexistent tickets', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest.fn().mockResolvedValueOnce(null),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(service.confirm('missing-ticket', {}, 'cashier-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(inventoryService.applySaleOut).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'CONFIRMED', 'VOIDED'])(
    'rejects confirmation for tickets in %s status',
    async (status) => {
      const tx = makeDraftTx({
        saleTicket: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(makeTicketRecord({ status }, [makeSaleItem()])),
          update: jest.fn(),
        },
      });

      prismaService.$transaction.mockImplementationOnce(async (callback) =>
        callback(tx),
      );

      await expect(service.confirm('ticket-1', {}, 'cashier-1')).rejects.toThrow(
        ConflictException,
      );
      expect(inventoryService.applySaleOut).not.toHaveBeenCalled();
    },
  );

  it('rejects confirmation when the sales channel is inactive', async () => {
    const tx = makeDraftTx({
      salesChannel: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'channel-1',
          active: false,
        }),
      },
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(makeTicketRecord({}, [makeSaleItem()])),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(service.confirm('ticket-1', {}, 'cashier-1')).rejects.toThrow(
      ConflictException,
    );
    expect(inventoryService.applySaleOut).not.toHaveBeenCalled();
  });

  it('rejects confirmation when stock movement fails and keeps the transaction atomic', async () => {
    const tx = makeDraftTx({
      salesChannel: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'channel-1',
          active: true,
        }),
      },
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(makeTicketRecord({}, [makeSaleItem()])),
        update: jest.fn(),
      },
    });
    inventoryService.applySaleOut.mockRejectedValueOnce(
      new ConflictException('Insufficient stock to confirm the sale ticket for the requested product.'),
    );

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(service.confirm('ticket-1', {}, 'cashier-1')).rejects.toThrow(
      ConflictException,
    );
    expect(tx.saleTicket.update).not.toHaveBeenCalled();
  });

  it('preserves item snapshots when confirming a ticket', async () => {
    const confirmedTicket = makeTicketRecord(
      {
        status: 'CONFIRMED',
        confirmedById: 'cashier-1',
        confirmedAt: new Date('2026-06-09T03:06:00.000Z'),
      },
      [
        makeSaleItem({
          productNameSnapshot: 'Hamburguesa clasica',
          productSkuSnapshot: 'BURGER-001',
          unitPriceSnapshot: new Decimal('5999.99'),
          unitCostSnapshot: new Decimal('2500'),
        }),
      ],
    );
    const tx = makeDraftTx({
      salesChannel: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'channel-1',
          active: true,
        }),
      },
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(makeTicketRecord({}, [makeSaleItem()]))
          .mockResolvedValueOnce(confirmedTicket),
        update: jest.fn().mockResolvedValue(undefined),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.confirm('ticket-1', {}, 'cashier-1');

    expect(result.items[0]?.productNameSnapshot).toBe('Hamburguesa clasica');
    expect(result.items[0]?.productSkuSnapshot).toBe('BURGER-001');
    expect(result.items[0]?.unitPriceSnapshot).toBe('5999.99');
    expect(result.items[0]?.unitCostSnapshot).toBe('2500');
  });

  it('does not touch inventory for NON_STOCKED items when confirming a draft ticket', async () => {
    const tx = makeDraftTx({
      salesChannel: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'channel-1',
          active: true,
        }),
      },
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            makeTicketRecord(
              {},
              [
                makeSaleItem({
                  productId: 'product-1',
                  product: {
                    active: true,
                    stockManagementType: StockManagementType.NON_STOCKED,
                  },
                }),
              ],
            ),
          )
          .mockResolvedValueOnce(
            makeTicketRecord(
              {
                status: 'CONFIRMED',
                confirmedById: 'cashier-1',
                confirmedAt: new Date('2026-06-09T03:06:00.000Z'),
              },
              [
                makeSaleItem({
                  productId: 'product-1',
                  product: {
                    active: true,
                    stockManagementType: StockManagementType.NON_STOCKED,
                  },
                }),
              ],
            ),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      inventoryMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.confirm('ticket-1', {}, 'cashier-1');

    expect(inventoryService.applySaleOut).not.toHaveBeenCalled();
    expect(result.status).toBe('CONFIRMED');
  });

  it('groups duplicate finished-product lines before delegating confirmation stock movement', async () => {
    const tx = makeDraftTx({
      salesChannel: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'channel-1',
          active: true,
        }),
      },
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            makeTicketRecord({}, [
              makeSaleItem({ quantity: new Decimal('2') }),
              makeSaleItem({
                id: 'item-2',
                quantity: new Decimal('3'),
              }),
            ]),
          )
          .mockResolvedValueOnce(
            makeTicketRecord(
              {
                status: 'CONFIRMED',
                confirmedById: 'cashier-1',
                confirmedAt: new Date('2026-06-09T03:06:00.000Z'),
              },
              [makeSaleItem({ quantity: new Decimal('2') })],
            ),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await service.confirm('ticket-1', {}, 'cashier-1');

    expect(inventoryService.applySaleOut).toHaveBeenCalledTimes(1);
    expect(inventoryService.applySaleOut).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        quantity: new Decimal('5'),
      }),
      tx,
    );
  });

  it('voids a confirmed ticket, delegates reversal and stores void metadata', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            makeTicketRecord({ status: 'CONFIRMED' }, [makeSaleItem()]),
          )
          .mockResolvedValueOnce(
            makeTicketRecord(
              {
                status: 'VOIDED',
                voidedById: 'manager-1',
                voidReason: 'Error de carga',
                voidedAt: new Date('2026-06-09T03:20:00.000Z'),
              },
              [makeSaleItem()],
            ),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.void(
      'ticket-1',
      { reason: 'Error de carga' },
      'manager-1',
    );

    expect(inventoryService.applyVoidReversal).toHaveBeenCalledWith(
      {
        productId: 'product-1',
        quantity: new Decimal('2'),
        reason: 'Error de carga',
        referenceId: 'ticket-1',
        createdById: 'manager-1',
      },
      tx,
    );
    expect(result.status).toBe('VOIDED');
    expect(result.voidedById).toBe('manager-1');
    expect(result.voidReason).toBe('Error de carga');
  });

  it('does not touch inventory for NON_STOCKED items when voiding a confirmed ticket', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            makeTicketRecord(
              { status: 'CONFIRMED' },
              [
                makeSaleItem({
                  product: {
                    active: true,
                    stockManagementType: StockManagementType.NON_STOCKED,
                  },
                }),
              ],
            ),
          )
          .mockResolvedValueOnce(
            makeTicketRecord(
              {
                status: 'VOIDED',
                voidedById: 'manager-1',
                voidReason: 'Error de carga',
                voidedAt: new Date('2026-06-09T03:20:00.000Z'),
              },
              [
                makeSaleItem({
                  product: {
                    active: true,
                    stockManagementType: StockManagementType.NON_STOCKED,
                  },
                }),
              ],
            ),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.void(
      'ticket-1',
      { reason: 'Error de carga' },
      'manager-1',
    );

    expect(inventoryService.applyVoidReversal).not.toHaveBeenCalled();
    expect(result.status).toBe('VOIDED');
  });

  it('rejects void when the ticket is not confirmed', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(makeTicketRecord({ status: 'DRAFT' })),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.void('ticket-1', { reason: 'Error de carga' }, 'manager-1'),
    ).rejects.toThrow(ConflictException);
    expect(inventoryService.applyVoidReversal).not.toHaveBeenCalled();
  });

  it('rejects void for nonexistent tickets', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest.fn().mockResolvedValueOnce(null),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.void('missing-ticket', { reason: 'Error de carga' }, 'manager-1'),
    ).rejects.toThrow(NotFoundException);
    expect(inventoryService.applyVoidReversal).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'VOIDED'])(
    'rejects void for tickets in %s status',
    async (status) => {
      const tx = makeDraftTx({
        saleTicket: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(makeTicketRecord({ status }, [makeSaleItem()])),
          update: jest.fn(),
        },
      });

      prismaService.$transaction.mockImplementationOnce(async (callback) =>
        callback(tx),
      );

      await expect(
        service.void('ticket-1', { reason: 'Error de carga' }, 'manager-1'),
      ).rejects.toThrow(ConflictException);
      expect(inventoryService.applyVoidReversal).not.toHaveBeenCalled();
    },
  );

  it('keeps the ticket confirmed when reversal fails', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            makeTicketRecord({ status: 'CONFIRMED' }, [makeSaleItem()]),
          ),
        update: jest.fn(),
      },
    });
    inventoryService.applyVoidReversal.mockRejectedValueOnce(
      new ConflictException('Reversal failed.'),
    );

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.void('ticket-1', { reason: 'Error de carga' }, 'manager-1'),
    ).rejects.toThrow(ConflictException);
    expect(tx.saleTicket.update).not.toHaveBeenCalled();
  });

  it('adds an item with snapshots and recalculates totals', async () => {
    const createItem = jest.fn().mockResolvedValue(undefined);
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'ticket-1',
            salesChannelId: 'channel-1',
            status: 'DRAFT',
          })
          .mockResolvedValueOnce(
            makeTicketRecord(
              {
                subtotal: new Decimal('11999.98'),
                total: new Decimal('11999.98'),
              },
              [
                {
                  id: 'item-1',
                  ticketId: 'ticket-1',
                  productId: 'product-1',
                  productNameSnapshot: 'Hamburguesa clasica',
                  productSkuSnapshot: 'BURGER-001',
                  productUnitSnapshot: 'UNIT',
                  quantity: new Decimal('2'),
                  unitPriceSnapshot: new Decimal('5999.99'),
                  unitCostSnapshot: new Decimal('2500'),
                  subtotal: new Decimal('11999.98'),
                  createdAt: new Date('2026-06-09T03:00:00.000Z'),
                  updatedAt: new Date('2026-06-09T03:05:00.000Z'),
                },
              ],
            ),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Hamburguesa clasica',
          sku: 'BURGER-001',
          unit: 'UNIT',
          active: true,
          stockManagementType: StockManagementType.FINISHED_PRODUCT,
        }),
      },
      productCostHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          cost: new Decimal('2500'),
        }),
      },
      productPriceHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          price: new Decimal('5999.99'),
        }),
      },
      saleTicketItem: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        create: createItem,
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            subtotal: new Decimal('11999.98'),
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.addItem('ticket-1', {
      productId: 'product-1',
      quantity: 2,
    });

    expect(createItem).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-1',
        productId: 'product-1',
        productNameSnapshot: 'Hamburguesa clasica',
        productSkuSnapshot: 'BURGER-001',
        productUnitSnapshot: 'UNIT',
        quantity: expect.any(Decimal),
        unitPriceSnapshot: new Decimal('5999.99'),
        unitCostSnapshot: new Decimal('2500'),
        subtotal: expect.any(Decimal),
      },
    });
    expect(tx.productStock?.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement?.create).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productNameSnapshot).toBe('Hamburguesa clasica');
    expect(result.items[0]?.unitPriceSnapshot).toBe('5999.99');
    expect(result.items[0]?.unitCostSnapshot).toBe('2500');
    expect(result.total).toBe('11999.98');
  });

  it('rejects nonexistent products when adding items', async () => {
    const tx = makeDraftTx({
      product: {
        findUnique: jest.fn().mockResolvedValueOnce(null),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.addItem('ticket-1', {
        productId: 'missing-product',
        quantity: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects inactive products when adding items', async () => {
    const tx = makeDraftTx({
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Hamburguesa clasica',
          sku: 'BURGER-001',
          unit: 'UNIT',
          active: false,
          stockManagementType: StockManagementType.FINISHED_PRODUCT,
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.addItem('ticket-1', {
        productId: 'product-1',
        quantity: 1,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('allows NON_STOCKED products in draft tickets', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'ticket-1',
            salesChannelId: 'channel-1',
            status: 'DRAFT',
          })
          .mockResolvedValueOnce(
            makeTicketRecord({
              subtotal: new Decimal('300'),
              total: new Decimal('300'),
            }),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Delivery fee',
          sku: 'DEL-001',
          unit: 'UNIT',
          active: true,
          stockManagementType: StockManagementType.NON_STOCKED,
        }),
      },
      productCostHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          cost: new Decimal('0'),
        }),
      },
      productPriceHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          price: new Decimal('300'),
        }),
      },
      saleTicketItem: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            subtotal: new Decimal('300'),
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.addItem('ticket-1', {
      productId: 'product-1',
      quantity: 1,
    });

    expect(result.total).toBe('300');
  });

  it('rejects RECIPE_BASED products in Sprint 6', async () => {
    const tx = makeDraftTx({
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Pizza',
          sku: 'PIZ-001',
          unit: 'UNIT',
          active: true,
          stockManagementType: StockManagementType.RECIPE_BASED,
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.addItem('ticket-1', {
        productId: 'product-1',
        quantity: 1,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects missing current price when adding items', async () => {
    const tx = makeDraftTx({
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Hamburguesa clasica',
          sku: 'BURGER-001',
          unit: 'UNIT',
          active: true,
          stockManagementType: StockManagementType.FINISHED_PRODUCT,
        }),
      },
      productCostHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          cost: new Decimal('2500'),
        }),
      },
      productPriceHistory: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.addItem('ticket-1', {
        productId: 'product-1',
        quantity: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects missing current cost when adding items', async () => {
    const tx = makeDraftTx({
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Hamburguesa clasica',
          sku: 'BURGER-001',
          unit: 'UNIT',
          active: true,
          stockManagementType: StockManagementType.FINISHED_PRODUCT,
        }),
      },
      productCostHistory: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.addItem('ticket-1', {
        productId: 'product-1',
        quantity: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('merges duplicate product items into the existing line', async () => {
    const updateItem = jest.fn().mockResolvedValue(undefined);
    const createItem = jest.fn().mockResolvedValue(undefined);
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'ticket-1',
            salesChannelId: 'channel-1',
            status: 'DRAFT',
          })
          .mockResolvedValueOnce(
            makeTicketRecord({
              subtotal: new Decimal('17999.97'),
              total: new Decimal('17999.97'),
            }),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      product: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'product-1',
          name: 'Hamburguesa clasica',
          sku: 'BURGER-001',
          unit: 'UNIT',
          active: true,
          stockManagementType: StockManagementType.FINISHED_PRODUCT,
        }),
      },
      productCostHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          cost: new Decimal('2500'),
        }),
      },
      productPriceHistory: {
        findFirst: jest.fn().mockResolvedValueOnce({
          price: new Decimal('7000'),
        }),
      },
      saleTicketItem: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'item-1',
          ticketId: 'ticket-1',
          productId: 'product-1',
          quantity: new Decimal('1'),
          unitPriceSnapshot: new Decimal('5999.99'),
          unitCostSnapshot: new Decimal('2500'),
        }),
        create: createItem,
        update: updateItem,
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            subtotal: new Decimal('17999.97'),
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.addItem('ticket-1', {
      productId: 'product-1',
      quantity: 2,
    });

    expect(createItem).not.toHaveBeenCalled();
    expect(updateItem).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        quantity: expect.any(Decimal),
        subtotal: expect.any(Decimal),
      },
    });
    expect(result.total).toBe('17999.97');
  });

  it('updates an item quantity and recalculates totals', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'ticket-1',
            salesChannelId: 'channel-1',
            status: 'DRAFT',
          })
          .mockResolvedValueOnce(
            makeTicketRecord({
              subtotal: new Decimal('17999.97'),
              total: new Decimal('17999.97'),
            }),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      saleTicketItem: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'item-1',
          ticketId: 'ticket-1',
          unitPriceSnapshot: new Decimal('5999.99'),
          unitCostSnapshot: new Decimal('2500'),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            subtotal: new Decimal('17999.97'),
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.updateItem('ticket-1', 'item-1', {
      quantity: 3,
    });

    expect(result.total).toBe('17999.97');
  });

  it('preserves snapshot price and cost when updating quantity', async () => {
    const updateItem = jest.fn().mockResolvedValue(undefined);
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'ticket-1',
            salesChannelId: 'channel-1',
            status: 'DRAFT',
          })
          .mockResolvedValueOnce(
            makeTicketRecord({
              subtotal: new Decimal('11999.98'),
              total: new Decimal('11999.98'),
            }),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      saleTicketItem: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'item-1',
          ticketId: 'ticket-1',
          quantity: new Decimal('1'),
          unitPriceSnapshot: new Decimal('5999.99'),
          unitCostSnapshot: new Decimal('2500'),
        }),
        create: jest.fn(),
        update: updateItem,
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            subtotal: new Decimal('11999.98'),
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await service.updateItem('ticket-1', 'item-1', {
      quantity: 2,
    });

    expect(updateItem).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        quantity: expect.any(Decimal),
        subtotal: expect.any(Decimal),
      },
    });
  });

  it('rejects item updates when the ticket is not in DRAFT', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'ticket-1',
          salesChannelId: 'channel-1',
          status: 'CANCELLED',
        }),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(
      service.updateItem('ticket-1', 'item-1', { quantity: 2 }),
    ).rejects.toThrow(ConflictException);
  });

  it('removes an item and recalculates totals', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'ticket-1',
            salesChannelId: 'channel-1',
            status: 'DRAFT',
          })
          .mockResolvedValueOnce(
            makeTicketRecord({
              subtotal: new Decimal('0'),
              total: new Decimal('0'),
            }),
          ),
        update: jest.fn().mockResolvedValue(undefined),
      },
      saleTicketItem: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'item-1',
        }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            subtotal: null,
          },
        }),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    const result = await service.removeItem('ticket-1', 'item-1');

    expect(result.total).toBe('0');
  });

  it('rejects item deletions when the ticket is not in DRAFT', async () => {
    const tx = makeDraftTx({
      saleTicket: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'ticket-1',
          salesChannelId: 'channel-1',
          status: 'CANCELLED',
        }),
        update: jest.fn(),
      },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await expect(service.removeItem('ticket-1', 'item-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects missing tickets', async () => {
    prismaService.saleTicket.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
