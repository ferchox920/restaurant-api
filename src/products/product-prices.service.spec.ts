import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { ProductPricesService } from './product-prices.service';

describe('ProductPricesService', () => {
  let service: ProductPricesService;
  let prismaService: {
    $transaction: jest.Mock;
    product: {
      findUnique: jest.Mock;
    };
    salesChannel: {
      findUnique: jest.Mock;
    };
    productPriceHistory: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let auditService: {
    log: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      product: {
        findUnique: jest.fn(),
      },
      salesChannel: {
        findUnique: jest.fn(),
      },
      productPriceHistory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new ProductPricesService(
      prismaService as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  it('creates the first price for a product and channel', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: true,
    });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productPriceHistory: {
          findFirst: jest.fn().mockResolvedValueOnce(null),
          update: jest.fn(),
          create: jest.fn().mockResolvedValueOnce({
            id: 'price-1',
            productId: 'product-1',
            salesChannelId: 'channel-1',
            price: new Decimal('7000'),
            validFrom: new Date('2026-06-09T00:00:00.000Z'),
            validTo: null,
            createdById: 'manager-1',
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            salesChannel: {
              name: 'Mostrador',
            },
          }),
        },
      }),
    );

    const result = await service.create(
      'product-1',
      { salesChannelId: 'channel-1', price: 7000 },
      'manager-1',
    );

    expect(prismaService.$transaction).toHaveBeenCalled();
    expect(result).toMatchObject({
      productId: 'product-1',
      salesChannelId: 'channel-1',
      price: '7000',
      isCurrent: true,
    });
  });

  it('closes the current price only for the same product and channel', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({
      id: 'price-2',
      productId: 'product-1',
      salesChannelId: 'channel-1',
      price: new Decimal('7500'),
      validFrom: new Date('2026-06-09T01:00:00.000Z'),
      validTo: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T01:00:00.000Z'),
      salesChannel: {
        name: 'Mostrador',
      },
    });

    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: true,
    });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productPriceHistory: {
          findFirst: jest.fn().mockResolvedValueOnce({
            id: 'price-1',
            productId: 'product-1',
            salesChannelId: 'channel-1',
            validTo: null,
          }),
          update,
          create,
        },
      }),
    );

    await service.create(
      'product-1',
      { salesChannelId: 'channel-1', price: 7500 },
      'manager-1',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'price-1' },
      data: { validTo: expect.any(Date) },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        salesChannelId: 'channel-1',
        price: 7500,
        validFrom: expect.any(Date),
        validTo: null,
        createdById: 'manager-1',
      },
      include: {
        salesChannel: {
          select: {
            name: true,
          },
        },
      },
    });
  });

  it('propagates transaction failures when creating the new price version', async () => {
    const transactionError = new Error('create failed');

    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: true,
    });
    prismaService.$transaction.mockRejectedValueOnce(transactionError);

    await expect(
      service.create(
        'product-1',
        { salesChannelId: 'channel-1', price: 7500 },
        'manager-1',
      ),
    ).rejects.toThrow('create failed');

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects price creation for nonexistent products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create(
        'missing-product',
        { salesChannelId: 'channel-1', price: 7000 },
        'manager-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects price creation for inactive products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: false,
    });

    await expect(
      service.create(
        'product-1',
        { salesChannelId: 'channel-1', price: 7000 },
        'manager-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects price creation for nonexistent sales channels', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create(
        'product-1',
        { salesChannelId: 'missing-channel', price: 7000 },
        'manager-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects price creation for inactive sales channels', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: false,
    });

    await expect(
      service.create(
        'product-1',
        { salesChannelId: 'channel-1', price: 7000 },
        'manager-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns current price for the requested channel', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
    });
    prismaService.productPriceHistory.findFirst.mockResolvedValueOnce({
      id: 'price-1',
      productId: 'product-1',
      salesChannelId: 'channel-1',
      price: new Decimal('7000'),
      validFrom: new Date('2026-06-09T00:00:00.000Z'),
      validTo: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      salesChannel: {
        name: 'Mostrador',
      },
    });

    const result = await service.findCurrent('product-1', 'channel-1');

    expect(result.salesChannelId).toBe('channel-1');
    expect(result.isCurrent).toBe(true);
  });

  it('throws when there is no current price for the requested channel', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
    });
    prismaService.productPriceHistory.findFirst.mockResolvedValueOnce(null);

    await expect(service.findCurrent('product-1', 'channel-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects current price lookup for nonexistent products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.findCurrent('missing-product', 'channel-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects current price lookup for nonexistent sales channels', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.findCurrent('product-1', 'missing-channel'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns full price history ordered by validFrom desc', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.productPriceHistory.findMany.mockResolvedValueOnce([
      {
        id: 'price-2',
        productId: 'product-1',
        salesChannelId: 'channel-2',
        price: new Decimal('7800'),
        validFrom: new Date('2026-06-09T02:00:00.000Z'),
        validTo: null,
        createdById: 'manager-1',
        createdAt: new Date('2026-06-09T02:00:00.000Z'),
        salesChannel: {
          name: 'PedidosYa',
        },
      },
      {
        id: 'price-1',
        productId: 'product-1',
        salesChannelId: 'channel-1',
        price: new Decimal('7000'),
        validFrom: new Date('2026-06-09T00:00:00.000Z'),
        validTo: null,
        createdById: 'manager-1',
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        salesChannel: {
          name: 'Mostrador',
        },
      },
    ]);

    const result = await service.findHistory('product-1');

    expect(prismaService.productPriceHistory.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        salesChannelId: undefined,
      },
      include: {
        salesChannel: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        validFrom: 'desc',
      },
    });
    expect(result[0]?.id).toBe('price-2');
  });

  it('returns filtered price history for one channel', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
    });
    prismaService.productPriceHistory.findMany.mockResolvedValueOnce([
      {
        id: 'price-1',
        productId: 'product-1',
        salesChannelId: 'channel-1',
        price: new Decimal('7000'),
        validFrom: new Date('2026-06-09T00:00:00.000Z'),
        validTo: null,
        createdById: 'manager-1',
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        salesChannel: {
          name: 'Mostrador',
        },
      },
    ]);

    const result = await service.findHistory('product-1', 'channel-1');

    expect(prismaService.productPriceHistory.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        salesChannelId: 'channel-1',
      },
      include: {
        salesChannel: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        validFrom: 'desc',
      },
    });
    expect(result).toHaveLength(1);
  });

  it('rejects filtered history lookup for nonexistent sales channels', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.findHistory('product-1', 'missing-channel'),
    ).rejects.toThrow(NotFoundException);
  });

  it('writes the audit log inside the same transaction when creating a price', async () => {
    const tx = {
      productPriceHistory: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValueOnce({
          id: 'price-1',
          productId: 'product-1',
          salesChannelId: 'channel-1',
          price: new Decimal('7000'),
          validFrom: new Date('2026-06-09T00:00:00.000Z'),
          validTo: null,
          createdById: 'manager-1',
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          salesChannel: {
            name: 'Mostrador',
          },
        }),
      },
    };

    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'channel-1',
      active: true,
    });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await service.create(
      'product-1',
      { salesChannelId: 'channel-1', price: 7000 },
      'manager-1',
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        entityId: 'price-1',
        metadata: {
          productId: 'product-1',
          salesChannelId: 'channel-1',
        },
      }),
      tx,
    );
  });
});
