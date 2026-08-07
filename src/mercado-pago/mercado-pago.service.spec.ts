import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MercadoPagoClient } from './mercado-pago.client';
import { MercadoPagoService } from './mercado-pago.service';
import { MercadoPagoPaymentResource } from './mercado-pago.types';

describe('MercadoPagoService', () => {
  const payment = (
    id: number,
    status: string,
    overrides: Partial<MercadoPagoPaymentResource> = {},
  ): MercadoPagoPaymentResource => ({
    id,
    transaction_amount: '1500.50',
    transaction_amount_refunded: status === 'refunded' ? '1500.50' : 0,
    currency_id: 'ARS',
    status,
    status_detail: status === 'approved' ? 'accredited' : null,
    payment_method_id: 'account_money',
    payment_type_id: 'account_money',
    installments: 1,
    external_reference: null,
    description: 'Restaurant payment',
    live_mode: true,
    date_created: '2026-07-01T12:00:00.000Z',
    date_approved: status === 'approved' ? '2026-07-01T12:01:00.000Z' : null,
    date_last_updated: '2026-07-01T12:02:00.000Z',
    transaction_details: { net_received_amount: '1450.25' },
    ...overrides,
  });

  const prismaMock = {
    mercadoPagoPayment: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const clientMock = {
    searchPayments: jest.fn(),
  };
  let service: MercadoPagoService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );
    prismaMock.mercadoPagoPayment.findMany.mockResolvedValue([]);
    prismaMock.mercadoPagoPayment.count.mockResolvedValue(0);
    prismaMock.mercadoPagoPayment.upsert.mockResolvedValue({});
    service = new MercadoPagoService(
      prismaMock as unknown as PrismaService,
      clientMock as unknown as MercadoPagoClient,
    );
  });

  it('uses a 30-day default range', async () => {
    clientMock.searchPayments.mockResolvedValue({
      paging: { total: 0, limit: 100, offset: 0 },
      results: [],
    });

    const before = Date.now();
    const result = await service.syncPayments({});
    const after = Date.now();

    expect(result.to.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.to.getTime()).toBeLessThanOrEqual(after);
    expect(result.to.getTime() - result.from.getTime()).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
  });

  it('paginates, normalizes all statuses and reports creates and updates', async () => {
    clientMock.searchPayments
      .mockResolvedValueOnce({
        paging: { total: 4, limit: 2, offset: 0 },
        results: [payment(1, 'approved'), payment(2, 'pending')],
      })
      .mockResolvedValueOnce({
        paging: { total: 4, limit: 2, offset: 2 },
        results: [payment(3, 'rejected'), payment(4, 'refunded')],
      });
    prismaMock.mercadoPagoPayment.findMany
      .mockResolvedValueOnce([{ externalPaymentId: '2' }])
      .mockResolvedValueOnce([]);

    const result = await service.syncPayments({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-02T00:00:00.000Z',
    });

    expect(result).toEqual({
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-02T00:00:00.000Z'),
      fetched: 4,
      created: 3,
      updated: 1,
    });
    expect(clientMock.searchPayments).toHaveBeenNthCalledWith(2, {
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-02T00:00:00.000Z'),
      limit: 100,
      offset: 2,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaMock.mercadoPagoPayment.upsert).toHaveBeenCalledTimes(4);
    expect(prismaMock.mercadoPagoPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalPaymentId: '1' },
        create: expect.objectContaining({
          transactionAmount: new Prisma.Decimal('1500.50'),
          netReceivedAmount: new Prisma.Decimal('1450.25'),
          dateApproved: new Date('2026-07-01T12:01:00.000Z'),
        }),
      }),
    );
  });

  it('is idempotent when all external payment ids already exist', async () => {
    clientMock.searchPayments.mockResolvedValue({
      paging: { total: 2, limit: 100, offset: 0 },
      results: [payment(1, 'approved'), payment(2, 'pending')],
    });
    prismaMock.mercadoPagoPayment.findMany.mockResolvedValue([
      { externalPaymentId: '1' },
      { externalPaymentId: '2' },
    ]);

    await expect(
      service.syncPayments({
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-02T00:00:00.000Z',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ fetched: 2, created: 0, updated: 2 }),
    );
  });

  it('rejects future, reversed and 365-day sync ranges', async () => {
    await expect(
      service.syncPayments({
        from: '2026-07-02T00:00:00.000Z',
        to: '2026-07-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.syncPayments({
        from: '2025-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('less than 365 days');

    await expect(
      service.syncPayments({
        from: new Date().toISOString(),
        to: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).rejects.toThrow('cannot be in the future');
  });

  it('rejects invalid external monetary and date fields', async () => {
    clientMock.searchPayments.mockResolvedValue({
      paging: { total: 1, limit: 100, offset: 0 },
      results: [
        payment(1, 'approved', {
          transaction_amount: 'not-a-number',
          date_created: 'not-a-date',
        }),
      ],
    });

    await expect(
      service.syncPayments({
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-02T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('lists local payments with filters and pagination', async () => {
    const stored = {
      id: '7b359be0-ce70-4bd3-bb19-a921c4e232d6',
      externalPaymentId: '1',
      transactionAmount: new Prisma.Decimal('1500.50'),
      netReceivedAmount: null,
      transactionAmountRefunded: new Prisma.Decimal(0),
      currencyId: 'ARS',
      status: 'approved',
      statusDetail: null,
      paymentMethodId: null,
      paymentTypeId: null,
      installments: null,
      externalReference: null,
      description: null,
      liveMode: true,
      dateCreated: new Date('2026-07-01T12:00:00.000Z'),
      dateApproved: null,
      dateLastUpdated: new Date('2026-07-01T12:02:00.000Z'),
      syncedAt: new Date('2026-07-02T00:00:00.000Z'),
      createdAt: new Date('2026-07-02T00:00:00.000Z'),
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    };
    prismaMock.mercadoPagoPayment.findMany.mockResolvedValue([stored]);
    prismaMock.mercadoPagoPayment.count.mockResolvedValue(1);

    const result = await service.findAll({
      status: 'approved',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-02T00:00:00.000Z',
      limit: 10,
      offset: 5,
    });

    expect(result).toEqual(
      expect.objectContaining({
        total: 1,
        limit: 10,
        offset: 5,
        items: [
          expect.objectContaining({
            externalPaymentId: '1',
            transactionAmount: 1500.5,
            netReceivedAmount: null,
          }),
        ],
      }),
    );
    expect(prismaMock.mercadoPagoPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'approved',
          dateCreated: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-02T00:00:00.000Z'),
          },
        },
        skip: 5,
        take: 10,
      }),
    );
  });
});
