import { Decimal } from '@prisma/client/runtime/library';
import { toSaleTicketItemResponse } from './sale-ticket-item-response.mapper';

describe('toSaleTicketItemResponse', () => {
  it('serializes item decimals as strings', () => {
    const result = toSaleTicketItemResponse({
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
    });

    expect(result).toMatchObject({
      quantity: '2',
      unitPriceSnapshot: '5999.99',
      unitCostSnapshot: '2500',
      subtotal: '11999.98',
    });
  });
});
