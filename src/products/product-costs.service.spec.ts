import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { ProductCostsService } from './product-costs.service';

describe('ProductCostsService', () => {
  let service: ProductCostsService;
  let prismaService: {
    $transaction: jest.Mock;
    product: {
      findUnique: jest.Mock;
    };
    productCostHistory: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
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
      productCostHistory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new ProductCostsService(
      prismaService as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  it('creates the first cost when there is no current one', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productCostHistory: {
          findFirst: jest.fn().mockResolvedValueOnce(null),
          update: jest.fn(),
          create: jest.fn().mockResolvedValueOnce({
            id: 'cost-1',
            productId: 'product-1',
            cost: new Decimal('3000'),
            validFrom: new Date('2026-06-09T00:00:00.000Z'),
            validTo: null,
            createdById: 'manager-1',
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
        },
      }),
    );

    const result = await service.create(
      'product-1',
      { cost: 3000 },
      'manager-1',
    );

    expect(prismaService.$transaction).toHaveBeenCalled();
    expect(result).toMatchObject({
      productId: 'product-1',
      cost: '3000',
      isCurrent: true,
    });
  });

  it('closes the current cost and creates a new version in one transaction', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({
      id: 'cost-2',
      productId: 'product-1',
      cost: new Decimal('3500'),
      validFrom: new Date('2026-06-09T01:00:00.000Z'),
      validTo: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T01:00:00.000Z'),
    });

    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productCostHistory: {
          findFirst: jest.fn().mockResolvedValueOnce({
            id: 'cost-1',
            validTo: null,
          }),
          update,
          create,
        },
      }),
    );

    await service.create('product-1', { cost: 3500 }, 'manager-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'cost-1' },
      data: { validTo: expect.any(Date) },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        cost: 3500,
        validFrom: expect.any(Date),
        validTo: null,
        createdById: 'manager-1',
      },
    });
  });

  it('propagates transaction failures when creating the new cost version', async () => {
    const transactionError = new Error('create failed');

    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.$transaction.mockRejectedValueOnce(transactionError);

    await expect(
      service.create('product-1', { cost: 3500 }, 'manager-1'),
    ).rejects.toThrow('create failed');

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects cost creation for nonexistent products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create('missing-product', { cost: 3000 }, 'manager-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects cost creation for inactive products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: false,
    });

    await expect(
      service.create('product-1', { cost: 3000 }, 'manager-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns cost history ordered by validFrom desc', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.productCostHistory.findMany.mockResolvedValueOnce([
      {
        id: 'cost-2',
        productId: 'product-1',
        cost: new Decimal('3500'),
        validFrom: new Date('2026-06-09T01:00:00.000Z'),
        validTo: null,
        createdById: 'manager-1',
        createdAt: new Date('2026-06-09T01:00:00.000Z'),
      },
      {
        id: 'cost-1',
        productId: 'product-1',
        cost: new Decimal('3000'),
        validFrom: new Date('2026-06-09T00:00:00.000Z'),
        validTo: new Date('2026-06-09T01:00:00.000Z'),
        createdById: 'manager-1',
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
      },
    ]);

    const result = await service.findHistory('product-1');

    expect(prismaService.productCostHistory.findMany).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      orderBy: {
        validFrom: 'desc',
      },
    });
    expect(result[0]?.id).toBe('cost-2');
  });

  it('returns the current cost', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.productCostHistory.findFirst.mockResolvedValueOnce({
      id: 'cost-2',
      productId: 'product-1',
      cost: new Decimal('3500'),
      validFrom: new Date('2026-06-09T01:00:00.000Z'),
      validTo: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T01:00:00.000Z'),
    });

    const result = await service.findCurrent('product-1');

    expect(result.id).toBe('cost-2');
    expect(result.isCurrent).toBe(true);
  });

  it('throws when there is no current cost', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
    });
    prismaService.productCostHistory.findFirst.mockResolvedValueOnce(null);

    await expect(service.findCurrent('product-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects current cost lookup for nonexistent products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce(null);

    await expect(service.findCurrent('missing-product')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects history lookup for nonexistent products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce(null);

    await expect(service.findHistory('missing-product')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('writes the audit log inside the same transaction when creating a cost', async () => {
    const tx = {
      productCostHistory: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValueOnce({
          id: 'cost-1',
          productId: 'product-1',
          cost: new Decimal('3000'),
          validFrom: new Date('2026-06-09T00:00:00.000Z'),
          validTo: null,
          createdById: 'manager-1',
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
        }),
      },
    };

    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      active: true,
    });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );

    await service.create('product-1', { cost: 3000 }, 'manager-1');

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        entityId: 'cost-1',
        metadata: {
          productId: 'product-1',
        },
      }),
      tx,
    );
  });
});
