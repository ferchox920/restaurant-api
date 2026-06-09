import { Decimal } from '@prisma/client/runtime/library';
import { toProductPriceResponse } from './product-price-response.mapper';

describe('toProductPriceResponse', () => {
  it('serializes decimal price as string and exposes salesChannelName when present', () => {
    const result = toProductPriceResponse({
      id: 'price-1',
      productId: 'product-1',
      salesChannelId: 'channel-1',
      price: new Decimal('5999.99'),
      validFrom: new Date('2026-06-09T03:00:00.000Z'),
      validTo: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      salesChannel: {
        name: 'PedidosYa',
      },
    });

    expect(result).toMatchObject({
      id: 'price-1',
      productId: 'product-1',
      salesChannelId: 'channel-1',
      salesChannelName: 'PedidosYa',
      price: '5999.99',
      isCurrent: true,
    });
  });

  it('falls back to null salesChannelName when relation is not loaded', () => {
    const result = toProductPriceResponse({
      id: 'price-2',
      productId: 'product-1',
      salesChannelId: 'channel-1',
      price: new Decimal('6100.00'),
      validFrom: new Date('2026-06-09T03:00:00.000Z'),
      validTo: new Date('2026-06-10T03:00:00.000Z'),
      createdById: null,
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      salesChannel: undefined as never,
    });

    expect(result.salesChannelName).toBeNull();
    expect(result.isCurrent).toBe(false);
  });
});
