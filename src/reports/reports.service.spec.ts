import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { StockManagementType } from '../products/product.enums';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaService: {
    product: {
      findMany: jest.Mock;
    };
    saleTicket: {
      findMany: jest.Mock;
    };
    saleTicketItem: {
      findMany: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
    inventoryMovement: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      product: {
        findMany: jest.fn(),
      },
      saleTicket: {
        findMany: jest.fn(),
      },
      saleTicketItem: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      inventoryMovement: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new ReportsService(prismaService as unknown as PrismaService);
  });

  it('returns stock report rows with ProductStock fallback and NOT_TRACKED status', async () => {
    prismaService.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Hamburguesa clasica',
        sku: 'BURGER-001',
        categoryId: 'category-1',
        unit: 'UNIT',
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: true,
        updatedAt: new Date('2026-06-10T00:00:00.000Z'),
        category: { name: 'Hamburguesas' },
        stock: null,
      },
      {
        id: 'product-2',
        name: 'Servicio de emplatado',
        sku: null,
        categoryId: null,
        unit: 'SERVICE',
        stockManagementType: StockManagementType.NON_STOCKED,
        active: true,
        updatedAt: new Date('2026-06-10T00:00:00.000Z'),
        category: null,
        stock: null,
      },
    ]);

    const result = await service.getStockReport({});

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        active: undefined,
        categoryId: undefined,
        stockManagementType: undefined,
        OR: undefined,
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
    expect(result[0]?.currentStock).toBe('0');
    expect(result[0]?.minimumStock).toBe('0');
    expect(result[0]?.stockStatus).toBe('OUT_OF_STOCK');
    expect(result[1]?.stockStatus).toBe('NOT_TRACKED');
  });

  it('filters stock report by derived stockStatus after mapping', async () => {
    prismaService.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Producto agotado',
        sku: 'PROD-1',
        categoryId: null,
        unit: 'UNIT',
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: true,
        updatedAt: new Date('2026-06-10T00:00:00.000Z'),
        category: null,
        stock: {
          currentStock: new Decimal('0'),
          minimumStock: new Decimal('2'),
          updatedAt: new Date('2026-06-10T01:00:00.000Z'),
        },
      },
      {
        id: 'product-2',
        name: 'Producto bajo',
        sku: 'PROD-2',
        categoryId: null,
        unit: 'UNIT',
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: true,
        updatedAt: new Date('2026-06-10T00:00:00.000Z'),
        category: null,
        stock: {
          currentStock: new Decimal('2'),
          minimumStock: new Decimal('3'),
          updatedAt: new Date('2026-06-10T01:00:00.000Z'),
        },
      },
      {
        id: 'product-3',
        name: 'Producto disponible',
        sku: 'PROD-3',
        categoryId: null,
        unit: 'UNIT',
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: true,
        updatedAt: new Date('2026-06-10T00:00:00.000Z'),
        category: null,
        stock: {
          currentStock: new Decimal('10'),
          minimumStock: new Decimal('3'),
          updatedAt: new Date('2026-06-10T01:00:00.000Z'),
        },
      },
    ]);

    const lowStock = await service.getStockReport({ stockStatus: 'LOW_STOCK' });
    const available = await service.getStockReport({
      stockStatus: 'AVAILABLE',
    });

    expect(lowStock).toHaveLength(1);
    expect(lowStock[0]?.productId).toBe('product-2');
    expect(available).toHaveLength(1);
    expect(available[0]?.productId).toBe('product-3');
  });

  it('aggregates confirmed sales by channel using historical snapshots', async () => {
    const from = new Date('2026-06-01T00:00:00.000Z');
    const to = new Date('2026-06-10T23:59:59.999Z');

    prismaService.saleTicket.findMany.mockResolvedValueOnce([
      {
        id: 'ticket-1',
        salesChannelId: 'channel-1',
        salesChannel: {
          name: 'PedidosYa',
          code: 'PEDIDOSYA',
        },
        items: [
          {
            ticketId: 'ticket-1',
            productId: 'product-1',
            productNameSnapshot: 'Hamburguesa clasica',
            productSkuSnapshot: 'BURGER-001',
            productUnitSnapshot: 'UNIT',
            quantity: new Decimal('2'),
            unitCostSnapshot: new Decimal('5'),
            subtotal: new Decimal('20'),
          },
          {
            ticketId: 'ticket-1',
            productId: 'product-2',
            productNameSnapshot: 'Papas fritas',
            productSkuSnapshot: 'PAP-001',
            productUnitSnapshot: 'PORTION',
            quantity: new Decimal('1'),
            unitCostSnapshot: new Decimal('3'),
            subtotal: new Decimal('7'),
          },
        ],
      },
    ]);

    const result = await service.getSalesByChannelReport({ from, to });

    expect(prismaService.saleTicket.findMany).toHaveBeenCalledWith({
      where: {
        status: 'CONFIRMED',
        salesChannelId: undefined,
        confirmedAt: {
          gte: from,
          lte: to,
        },
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
    expect(result).toEqual([
      {
        salesChannelId: 'channel-1',
        salesChannelName: 'PedidosYa',
        salesChannelCode: 'PEDIDOSYA',
        ticketsCount: 1,
        itemsCount: 2,
        quantitySold: '3',
        grossSales: '27',
        historicalCost: '13',
        grossProfit: '14',
        averageTicket: '27',
      },
    ]);
  });

  it('passes salesChannelId filter to confirmed sales by channel query', async () => {
    prismaService.saleTicket.findMany.mockResolvedValueOnce([]);

    await service.getSalesByChannelReport({
      salesChannelId: 'channel-1',
    });

    expect(prismaService.saleTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'CONFIRMED',
          salesChannelId: 'channel-1',
        }),
      }),
    );
  });

  it('aggregates sales by product using item snapshots instead of current product data', async () => {
    prismaService.saleTicketItem.findMany.mockResolvedValueOnce([
      {
        ticketId: 'ticket-1',
        productId: 'product-1',
        productNameSnapshot: 'Burger v2',
        productSkuSnapshot: 'BURGER-NEW',
        productUnitSnapshot: 'UNIT',
        quantity: new Decimal('2'),
        unitCostSnapshot: new Decimal('5'),
        subtotal: new Decimal('20'),
        ticket: {
          confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
        },
      },
      {
        ticketId: 'ticket-2',
        productId: 'product-1',
        productNameSnapshot: 'Burger v1',
        productSkuSnapshot: 'BURGER-OLD',
        productUnitSnapshot: 'UNIT',
        quantity: new Decimal('1'),
        unitCostSnapshot: new Decimal('5'),
        subtotal: new Decimal('10'),
        ticket: {
          confirmedAt: new Date('2026-06-09T10:00:00.000Z'),
        },
      },
    ]);

    const result = await service.getSalesByProductReport({});

    expect(result).toEqual([
      {
        productId: 'product-1',
        productNameSnapshot: 'Burger v2',
        productSkuSnapshot: 'BURGER-NEW',
        productUnitSnapshot: 'UNIT',
        quantitySold: '3',
        grossSales: '30',
        historicalCost: '15',
        grossProfit: '15',
        ticketsCount: 2,
      },
    ]);
  });

  it('passes product and sales channel filters to sales by product query', async () => {
    const from = new Date('2026-06-01T00:00:00.000Z');
    const to = new Date('2026-06-10T23:59:59.999Z');
    prismaService.saleTicketItem.findMany.mockResolvedValueOnce([]);

    await service.getSalesByProductReport({
      productId: 'product-1',
      salesChannelId: 'channel-1',
      from,
      to,
    });

    expect(prismaService.saleTicketItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productId: 'product-1',
          ticket: {
            status: 'CONFIRMED',
            salesChannelId: 'channel-1',
            confirmedAt: {
              gte: from,
              lte: to,
            },
          },
        },
      }),
    );
  });

  it('aggregates sales by confirmed user and resolves user profile data', async () => {
    prismaService.saleTicket.findMany.mockResolvedValueOnce([
      {
        id: 'ticket-1',
        confirmedById: 'user-1',
        items: [
          {
            quantity: new Decimal('2'),
            unitCostSnapshot: new Decimal('5'),
            subtotal: new Decimal('20'),
          },
        ],
      },
      {
        id: 'ticket-2',
        confirmedById: 'user-1',
        items: [
          {
            quantity: new Decimal('1'),
            unitCostSnapshot: new Decimal('3'),
            subtotal: new Decimal('7'),
          },
        ],
      },
    ]);
    prismaService.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'manager@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    ]);

    const result = await service.getSalesByUserReport({});

    expect(result).toEqual([
      {
        userId: 'user-1',
        userEmail: 'manager@example.com',
        userFullName: 'Ada Lovelace',
        ticketsCount: 2,
        itemsCount: 2,
        quantitySold: '3',
        grossSales: '27',
        historicalCost: '13',
        grossProfit: '14',
      },
    ]);
  });

  it('keeps tickets without confirmedById grouped as unknown user bucket', async () => {
    prismaService.saleTicket.findMany.mockResolvedValueOnce([
      {
        id: 'ticket-1',
        confirmedById: null,
        items: [
          {
            quantity: new Decimal('1'),
            unitCostSnapshot: new Decimal('2'),
            subtotal: new Decimal('5'),
          },
        ],
      },
    ]);

    const result = await service.getSalesByUserReport({});

    expect(prismaService.user.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        userId: null,
        userEmail: null,
        userFullName: null,
        ticketsCount: 1,
        itemsCount: 1,
        quantitySold: '1',
        grossSales: '5',
        historicalCost: '2',
        grossProfit: '3',
      },
    ]);
  });

  it('lists inventory movements using filters and paginated response', async () => {
    const from = new Date('2026-06-01T00:00:00.000Z');
    const to = new Date('2026-06-10T23:59:59.999Z');
    prismaService.inventoryMovement.findMany.mockResolvedValueOnce([
      {
        id: 'movement-1',
        productId: 'product-1',
        movementType: 'SALE_OUT',
        quantity: new Decimal('2'),
        previousStock: new Decimal('10'),
        newStock: new Decimal('8'),
        reason: 'Venta confirmada',
        referenceType: 'SALE_TICKET',
        referenceId: 'ticket-1',
        createdById: 'user-1',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        product: {
          name: 'Hamburguesa clasica',
          sku: 'BURGER-001',
        },
      },
    ]);
    prismaService.inventoryMovement.count.mockResolvedValueOnce(1);
    prismaService.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'cashier@example.com',
        firstName: 'Grace',
        lastName: 'Hopper',
      },
    ]);

    const result = await service.getInventoryMovementsReport({
      from,
      to,
      productId: 'product-1',
      movementType: 'SALE_OUT',
      referenceType: 'SALE_TICKET',
      createdById: 'user-1',
      limit: 25,
      offset: 10,
    });

    expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        movementType: 'SALE_OUT',
        referenceType: 'SALE_TICKET',
        createdById: 'user-1',
        createdAt: {
          gte: from,
          lte: to,
        },
      },
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
      skip: 10,
      take: 25,
    });
    expect(prismaService.inventoryMovement.count).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        movementType: 'SALE_OUT',
        referenceType: 'SALE_TICKET',
        createdById: 'user-1',
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    });
    expect(result).toMatchObject({
      limit: 25,
      offset: 10,
      total: 1,
      items: [
        {
          movementId: 'movement-1',
          productId: 'product-1',
          productName: 'Hamburguesa clasica',
          productSku: 'BURGER-001',
          movementType: 'SALE_OUT',
          quantity: '2',
          createdByEmail: 'cashier@example.com',
          createdByName: 'Grace Hopper',
        },
      ],
    });
  });

  it('uses default pagination for inventory movements when limit and offset are not provided', async () => {
    prismaService.inventoryMovement.findMany.mockResolvedValueOnce([]);
    prismaService.inventoryMovement.count.mockResolvedValueOnce(0);

    const result = await service.getInventoryMovementsReport({});

    expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
      }),
    );
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
    expect(result.total).toBe(0);
  });

  it('caps inventory movements limit at 100 in the service', async () => {
    prismaService.inventoryMovement.findMany.mockResolvedValueOnce([]);
    prismaService.inventoryMovement.count.mockResolvedValueOnce(0);

    const result = await service.getInventoryMovementsReport({
      limit: 500,
      offset: 0,
    });

    expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
    expect(result.limit).toBe(100);
  });
});
