import { Decimal } from '@prisma/client/runtime/library';
import { toProductCostResponse } from './product-cost-response.mapper';

describe('toProductCostResponse', () => {
  it('serializes decimal cost as string and marks current version', () => {
    const result = toProductCostResponse({
      id: 'cost-1',
      productId: 'product-1',
      cost: new Decimal('3500.50'),
      validFrom: new Date('2026-06-09T03:00:00.000Z'),
      validTo: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
    });

    expect(result).toMatchObject({
      id: 'cost-1',
      productId: 'product-1',
      cost: '3500.5',
      isCurrent: true,
    });
  });

  it('marks closed versions as non-current', () => {
    const result = toProductCostResponse({
      id: 'cost-2',
      productId: 'product-1',
      cost: new Decimal('4200.00'),
      validFrom: new Date('2026-06-08T03:00:00.000Z'),
      validTo: new Date('2026-06-09T03:00:00.000Z'),
      createdById: null,
      createdAt: new Date('2026-06-08T03:00:00.000Z'),
    });

    expect(result.isCurrent).toBe(false);
  });
});
