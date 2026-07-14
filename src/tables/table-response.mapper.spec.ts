import { toTableResponse } from './table-response.mapper';

describe('toTableResponse', () => {
  const baseTable = {
    id: 'table-1',
    code: 'M01',
    name: 'Mesa 1',
    area: 'Salon',
    capacity: 4,
    active: true,
    createdById: 'admin-1',
    createdAt: new Date('2026-06-29T22:00:00.000Z'),
    updatedAt: new Date('2026-06-29T22:00:00.000Z'),
  };

  it('derives AVAILABLE for active tables', () => {
    const result = toTableResponse(baseTable);

    expect(result.status).toBe('AVAILABLE');
    expect(result.code).toBe('M01');
    expect(result.area).toBe('Salon');
  });

  it('derives OCCUPIED for active tables with an open order', () => {
    const result = toTableResponse({
      ...baseTable,
      orders: [
        {
          id: 'order-1',
          saleTicketId: 'ticket-1',
          openedAt: new Date('2026-06-30T18:00:00.000Z'),
          notes: 'Cliente frecuente',
        },
      ],
    });

    expect(result.status).toBe('OCCUPIED');
    expect(result.openOrder).toEqual({
      id: 'order-1',
      saleTicketId: 'ticket-1',
      openedAt: new Date('2026-06-30T18:00:00.000Z'),
      notes: 'Cliente frecuente',
    });
  });

  it('derives INACTIVE for inactive tables', () => {
    expect(toTableResponse({ ...baseTable, active: false }).status).toBe(
      'INACTIVE',
    );
  });
});
