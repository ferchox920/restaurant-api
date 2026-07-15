import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PosService } from './pos.service';

describe('PosService', () => {
  const prisma = {
    product: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
  };

  it('keeps the endpoint unavailable while its flag is disabled', async () => {
    const service = new PosService(
      prisma as never,
      { get: () => false } as never,
    );
    await expect(
      service.getCatalog({ salesChannelId: 'channel-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns at most the requested page and an opaque cursor', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'A',
        description: null,
        sku: null,
        categoryId: null,
        unit: 'UNIT',
        stockManagementType: 'FINISHED_PRODUCT',
        active: true,
        category: null,
        stock: { currentStock: new Decimal(2), minimumStock: new Decimal(1) },
        priceHistory: [{ price: new Decimal(10) }],
      },
      {
        id: 'product-2',
        name: 'B',
        description: null,
        sku: null,
        categoryId: null,
        unit: 'UNIT',
        stockManagementType: 'NON_STOCKED',
        active: true,
        category: null,
        stock: null,
        priceHistory: [{ price: new Decimal(20) }],
      },
    ]);
    prisma.category.findMany.mockResolvedValue([]);
    const service = new PosService(
      prisma as never,
      { get: () => true } as never,
    );
    const result = await service.getCatalog({
      salesChannelId: 'channel-1',
      limit: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      currentPrice: '10',
      stockStatus: 'AVAILABLE',
    });
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('rejects malformed cursors before querying', async () => {
    const service = new PosService(
      prisma as never,
      { get: () => true } as never,
    );
    await expect(
      service.getCatalog({ salesChannelId: 'channel-1', cursor: 'invalid' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
