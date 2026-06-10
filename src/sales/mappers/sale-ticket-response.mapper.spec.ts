import { Decimal } from '@prisma/client/runtime/library';
import { toSaleTicketResponse } from './sale-ticket-response.mapper';

describe('toSaleTicketResponse', () => {
  it('serializes ticket decimals as strings and maps items', () => {
    const result = toSaleTicketResponse({
      id: 'ticket-1',
      ticketNumber: 1001,
      salesChannelId: 'channel-1',
      status: 'DRAFT',
      subtotal: new Decimal('11999.98'),
      discountTotal: new Decimal('0'),
      commissionTotal: new Decimal('0'),
      total: new Decimal('11999.98'),
      notes: 'Mesa 4',
      createdById: 'user-1',
      confirmedById: 'user-2',
      cancelledById: null,
      voidedById: null,
      cancellationReason: null,
      voidReason: null,
      createdAt: new Date('2026-06-09T03:00:00.000Z'),
      updatedAt: new Date('2026-06-09T03:05:00.000Z'),
      confirmedAt: new Date('2026-06-09T03:06:00.000Z'),
      cancelledAt: null,
      voidedAt: null,
      salesChannel: {
        name: 'PedidosYa',
      },
      items: [
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
    });

    expect(result).toMatchObject({
      ticketNumber: 1001,
      salesChannelName: 'PedidosYa',
      subtotal: '11999.98',
      total: '11999.98',
      confirmedById: 'user-2',
    });
    expect(result.items[0]?.subtotal).toBe('11999.98');
    expect(result.confirmedAt).toEqual(new Date('2026-06-09T03:06:00.000Z'));
  });
});
