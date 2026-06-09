import { Decimal } from '@prisma/client/runtime/library';
import { toInventoryMovementResponse } from './inventory-movement-response.mapper';

describe('toInventoryMovementResponse', () => {
  it('serializes decimals as strings and exposes productName', () => {
    const result = toInventoryMovementResponse({
      id: 'movement-1',
      productId: 'product-1',
      movementType: 'STOCK_IN',
      quantity: new Decimal('4.50'),
      previousStock: new Decimal('3.00'),
      newStock: new Decimal('7.50'),
      reason: 'Reposicion.',
      referenceType: 'MANUAL',
      referenceId: null,
      createdById: 'user-1',
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      product: {
        name: 'Hamburguesa clasica',
      },
    });

    expect(result).toMatchObject({
      quantity: '4.5',
      previousStock: '3',
      newStock: '7.5',
      productName: 'Hamburguesa clasica',
      createdById: 'user-1',
    });
  });

  it('falls back to empty productName when relation is not loaded', () => {
    const result = toInventoryMovementResponse({
      id: 'movement-2',
      productId: 'product-1',
      movementType: 'WASTE',
      quantity: new Decimal('1'),
      previousStock: new Decimal('2'),
      newStock: new Decimal('1'),
      reason: 'Merma.',
      referenceType: 'MANUAL',
      referenceId: 'waste-1',
      createdById: null,
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      product: null,
    });

    expect(result.productName).toBe('');
    expect(result.referenceId).toBe('waste-1');
    expect(result.createdById).toBeNull();
  });
});
