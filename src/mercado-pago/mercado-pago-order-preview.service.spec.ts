import { ConflictException, NotFoundException } from '@nestjs/common';
import { SaleTicketResponseDto } from '../sales/dto/sale-ticket-response.dto';
import { SalesService } from '../sales/sales.service';
import { MercadoPagoOrderPreviewService } from './mercado-pago-order-preview.service';

describe('MercadoPagoOrderPreviewService', () => {
  const salesService = {
    findOne: jest.fn(),
  };
  let service: MercadoPagoOrderPreviewService;

  const ticket = (
    overrides: Partial<SaleTicketResponseDto> = {},
  ): SaleTicketResponseDto => ({
    version: '1',
    id: '7b359be0-ce70-4bd3-bb19-a921c4e232d6',
    ticketNumber: 1001,
    salesChannelId: '36e99af7-bb21-4bbc-8c9a-7c785be8e6dc',
    salesChannelName: 'Salon',
    status: 'DRAFT',
    paymentMethod: null,
    paymentBankId: null,
    paymentBankName: null,
    paymentBankNameSnapshot: null,
    subtotal: '3750.05',
    discountTotal: '0',
    commissionTotal: '0',
    total: '3750.05',
    notes: null,
    createdById: null,
    confirmedById: null,
    cancelledById: null,
    voidedById: null,
    cancellationReason: null,
    voidReason: null,
    createdAt: new Date('2026-07-15T00:00:00.000Z'),
    updatedAt: new Date('2026-07-15T00:00:00.000Z'),
    confirmedAt: null,
    cancelledAt: null,
    voidedAt: null,
    items: [
      {
        id: 'b42a7e07-7b2f-43df-a9ea-a33d4c28daa7',
        ticketId: '7b359be0-ce70-4bd3-bb19-a921c4e232d6',
        productId: 'be003e9b-96a4-4417-b127-0a8c63603bb9',
        productNameSnapshot: 'Hamburguesa completa',
        productSkuSnapshot: 'HAMB-001',
        productUnitSnapshot: 'UNIT',
        quantity: '0.5',
        unitPriceSnapshot: '7500.10',
        unitCostSnapshot: '2500',
        subtotal: '3750.05',
        createdAt: new Date('2026-07-15T00:00:00.000Z'),
        updatedAt: new Date('2026-07-15T00:00:00.000Z'),
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MercadoPagoOrderPreviewService(
      salesService as unknown as SalesService,
    );
  });

  it('maps ticket snapshots to an online order payload with decimal precision', async () => {
    salesService.findOne.mockResolvedValue(ticket());

    await expect(
      service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
    ).resolves.toEqual({
      ticketId: '7b359be0-ce70-4bd3-bb19-a921c4e232d6',
      ticketNumber: 1001,
      payload: {
        type: 'online',
        processing_mode: 'automatic',
        external_reference: '7b359be0-ce70-4bd3-bb19-a921c4e232d6',
        description: 'Ticket #1001',
        total_amount: '3750.05',
        items: [
          {
            title: 'Hamburguesa completa',
            description: 'Hamburguesa completa',
            unit_price: '7500.10',
            quantity: 0.5,
            external_code: 'HAMB-001',
          },
        ],
      },
    });
    expect(salesService.findOne).toHaveBeenCalledTimes(1);
  });

  it('uses productId when the SKU snapshot is absent or blank', async () => {
    const withoutSku = ticket();
    withoutSku.items[0].productSkuSnapshot = '  ';
    salesService.findOne.mockResolvedValue(withoutSku);

    const result = await service.preview(withoutSku.id);

    expect(result.payload.items[0].external_code).toBe(
      withoutSku.items[0].productId,
    );
  });

  it.each(['CONFIRMED', 'CANCELLED', 'VOIDED'])(
    'rejects a %s ticket',
    async (status) => {
      salesService.findOne.mockResolvedValue(ticket({ status }));

      await expect(
        service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
      ).rejects.toThrow('Only DRAFT sale tickets');
    },
  );

  it('rejects an empty ticket', async () => {
    salesService.findOne.mockResolvedValue(
      ticket({ items: [], subtotal: '0', total: '0' }),
    );

    await expect(
      service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['0', '-1.00'])(
    'rejects a non-positive total of %s',
    async (total) => {
      salesService.findOne.mockResolvedValue(ticket({ total }));

      await expect(
        service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
      ).rejects.toThrow('total must be positive');
    },
  );

  it('rejects discounts and commissions not represented by items', async () => {
    salesService.findOne.mockResolvedValue(ticket({ discountTotal: '10.00' }));

    await expect(
      service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
    ).rejects.toThrow('Discounts and commissions are not supported');
  });

  it('rejects a total that differs from the item subtotals', async () => {
    salesService.findOne.mockResolvedValue(ticket({ total: '3750.04' }));

    await expect(
      service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
    ).rejects.toThrow('does not match the sum of its items');
  });

  it('propagates ticket not found and performs no external work', async () => {
    salesService.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      service.preview('7b359be0-ce70-4bd3-bb19-a921c4e232d6'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(Object.keys(salesService)).toEqual(['findOne']);
  });
});
