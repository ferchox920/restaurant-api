import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SalePaymentMethod, SaleTicketStatus } from '../sales/sales.enums';
import { SalesService } from '../sales/sales.service';
import { MercadoPagoClient } from './mercado-pago.client';
import { MercadoPagoOrderPreviewService } from './mercado-pago-order-preview.service';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';

describe('MercadoPagoOrdersService', () => {
  const ticketId = '5b4c0bb0-5a94-4fe0-838b-6c809aaf65af';
  const actorId = '6c4c0bb0-5a94-4fe0-838b-6c809aaf65af';
  const externalResource = {
    id: 'ORD01TEST',
    type: 'online',
    processing_mode: 'automatic',
    external_reference: ticketId,
    total_amount: '1500.00',
    total_paid_amount: '1500.00',
    currency: 'ARS',
    status: 'processed',
    status_detail: 'accredited',
    created_date: '2026-08-06T12:00:00.000Z',
    last_updated_date: '2026-08-06T12:01:00.000Z',
    transactions: {
      payments: [
        {
          id: 'PAY01TEST',
          amount: '1500.00',
          paid_amount: '1500.00',
          status: 'processed',
          status_detail: 'accredited',
          payment_method: {
            id: 'master',
            type: 'credit_card',
            installments: 1,
          },
        },
      ],
    },
  };
  const dto = {
    cardToken: 'one-use-card-token',
    paymentMethodId: 'master',
    paymentTypeId: 'credit_card' as const,
    installments: 1,
    payerEmail: 'buyer@testuser.com',
  };
  const makeStored = (overrides: Record<string, unknown> = {}) => ({
    id: '7d4c0bb0-5a94-4fe0-838b-6c809aaf65af',
    saleTicketId: ticketId,
    externalOrderId: externalResource.id,
    idempotencyKey: 'checkout-attempt-1',
    status: 'processed',
    statusDetail: 'accredited',
    totalAmount: new Prisma.Decimal('1500'),
    totalPaidAmount: new Prisma.Decimal('1500'),
    currencyId: 'ARS',
    paymentId: 'PAY01TEST',
    paymentStatus: 'processed',
    paymentStatusDetail: 'accredited',
    paymentMethodId: 'master',
    paymentTypeId: 'credit_card',
    installments: 1,
    checkoutUrl: null,
    createdById: actorId,
    externalCreatedAt: new Date('2026-08-06T12:00:00.000Z'),
    externalUpdatedAt: new Date('2026-08-06T12:01:00.000Z'),
    syncedAt: new Date('2026-08-06T12:01:00.000Z'),
    reconciledAt: null,
    reconciliationError: null,
    createdAt: new Date('2026-08-06T12:00:00.000Z'),
    updatedAt: new Date('2026-08-06T12:01:00.000Z'),
    ...overrides,
  });

  let stored: Record<string, unknown> | null;
  const prismaMock = {
    mercadoPagoOrder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const clientMock = {
    createOrder: jest.fn(),
    getOrder: jest.fn(),
  };
  const previewMock = {
    preview: jest.fn(),
  };
  const salesMock = {
    findOne: jest.fn(),
    confirm: jest.fn(),
  };
  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'MERCADO_PAGO_CURRENCY') return 'ARS';
      if (key === 'MERCADO_PAGO_STATEMENT_DESCRIPTOR') return 'RESTAURANTE';
      return undefined;
    }),
  };
  let service: MercadoPagoOrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    previewMock.preview.mockResolvedValue({
      ticketId,
      ticketNumber: 42,
      payload: {
        type: 'online',
        processing_mode: 'automatic',
        external_reference: ticketId,
        description: 'Ticket #42',
        total_amount: '1500.00',
        items: [
          {
            title: 'Milanesa',
            description: 'Milanesa',
            unit_price: '1500.00',
            quantity: 1,
            external_code: 'MIL-1',
          },
        ],
      },
    });
    clientMock.createOrder.mockResolvedValue(externalResource);
    salesMock.findOne.mockResolvedValue({
      id: ticketId,
      status: SaleTicketStatus.DRAFT,
      paymentMethod: null,
    });
    salesMock.confirm.mockResolvedValue({});
    prismaMock.mercadoPagoOrder.findUnique.mockImplementation(
      ({ where }: { where: { id?: string; idempotencyKey?: string } }) => {
        if (where.idempotencyKey) return null;
        return stored;
      },
    );
    prismaMock.mercadoPagoOrder.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        stored = {
          id: '7d4c0bb0-5a94-4fe0-838b-6c809aaf65af',
          ...data,
          createdAt: new Date('2026-08-06T12:00:00.000Z'),
          updatedAt: new Date('2026-08-06T12:00:00.000Z'),
          reconciledAt: null,
          reconciliationError: null,
        };
        return stored;
      },
    );
    prismaMock.mercadoPagoOrder.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        stored = { ...stored, ...data };
        return stored;
      },
    );
    service = new MercadoPagoOrdersService(
      prismaMock as unknown as PrismaService,
      clientMock as unknown as MercadoPagoClient,
      previewMock as unknown as MercadoPagoOrderPreviewService,
      salesMock as unknown as SalesService,
      configMock as unknown as ConfigService,
    );
  });

  it('derives the amount and items from the ticket and confirms an approved payment', async () => {
    const result = await service.create(
      ticketId,
      dto,
      actorId,
      'checkout-attempt-1',
    );

    expect(clientMock.createOrder).toHaveBeenCalledWith({
      idempotencyKey: 'checkout-attempt-1',
      payload: expect.objectContaining({
        external_reference: ticketId,
        total_amount: '1500.00',
        items: [expect.objectContaining({ title: 'Milanesa' })],
        transactions: {
          payments: [
            expect.objectContaining({
              amount: '1500.00',
              payment_method: expect.objectContaining({
                token: 'one-use-card-token',
              }),
            }),
          ],
        },
      }),
    });
    expect(prismaMock.mercadoPagoOrder.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ cardToken: expect.anything() }),
    });
    expect(salesMock.confirm).toHaveBeenCalledWith(
      ticketId,
      { paymentMethod: SalePaymentMethod.MERCADO_PAGO },
      actorId,
    );
    expect(result.reconciledAt).toBeInstanceOf(Date);
    expect(result.reconciliationError).toBeNull();
  });

  it('stores rejected orders without confirming the sale ticket', async () => {
    clientMock.createOrder.mockResolvedValue({
      ...externalResource,
      status: 'failed',
      status_detail: 'cc_rejected_other_reason',
      total_paid_amount: '0',
      transactions: {
        payments: [
          {
            ...externalResource.transactions.payments[0],
            status: 'failed',
            status_detail: 'cc_rejected_other_reason',
          },
        ],
      },
    });

    const result = await service.create(
      ticketId,
      dto,
      actorId,
      'checkout-attempt-2',
    );

    expect(salesMock.confirm).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
    expect(result.reconciledAt).toBeNull();
  });

  it('records a reconciliation warning for refunded orders', async () => {
    stored = makeStored({ reconciledAt: new Date() });
    clientMock.getOrder.mockResolvedValue({
      ...externalResource,
      status: 'refunded',
      status_detail: 'refunded',
    });

    const result = await service.refresh(String(stored.id));

    expect(result.reconciliationError).toContain('refund');
    expect(result.reconciledAt).toBeNull();
    expect(salesMock.confirm).not.toHaveBeenCalled();
  });

  it('requires a bounded idempotency key before any external call', async () => {
    await expect(service.create(ticketId, dto, actorId)).rejects.toThrow(
      'Idempotency-Key is required.',
    );
    await expect(
      service.create(ticketId, dto, actorId, 'x'.repeat(151)),
    ).rejects.toThrow('at most 150 characters');
    expect(previewMock.preview).not.toHaveBeenCalled();
    expect(clientMock.createOrder).not.toHaveBeenCalled();
  });

  it('returns a prior attempt and rejects cross-ticket key reuse', async () => {
    const existing = makeStored();
    prismaMock.mercadoPagoOrder.findUnique.mockResolvedValueOnce(existing);
    await expect(
      service.create(ticketId, dto, actorId, ' checkout-attempt-1 '),
    ).resolves.toEqual(
      expect.objectContaining({ externalOrderId: externalResource.id }),
    );
    expect(clientMock.createOrder).not.toHaveBeenCalled();

    prismaMock.mercadoPagoOrder.findUnique.mockResolvedValueOnce(existing);
    await expect(
      service.create(
        '8e4c0bb0-5a94-4fe0-838b-6c809aaf65af',
        dto,
        actorId,
        'checkout-attempt-1',
      ),
    ).rejects.toEqual(
      expect.objectContaining({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } }),
    );
  });

  it('includes optional payer identity but never accepts a client total', async () => {
    await service.create(
      ticketId,
      {
        ...dto,
        payerFirstName: 'Maria',
        payerLastName: 'Gonzalez',
        identificationType: 'DNI',
        identificationNumber: '12345678',
      },
      actorId,
      'checkout-with-payer',
    );

    expect(clientMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          total_amount: '1500.00',
          payer: {
            email: 'buyer@testuser.com',
            first_name: 'Maria',
            last_name: 'Gonzalez',
            identification: { type: 'DNI', number: '12345678' },
          },
        }),
      }),
    );
  });

  it('rejects an external Order linked to another ticket', async () => {
    clientMock.createOrder.mockResolvedValue({
      ...externalResource,
      external_reference: 'another-ticket',
    });

    await expect(
      service.create(ticketId, dto, actorId, 'mismatched-order'),
    ).rejects.toThrow('linked to a different ticket');
    expect(prismaMock.mercadoPagoOrder.create).not.toHaveBeenCalled();
  });

  it('rejects invalid external monetary values and dates', async () => {
    clientMock.createOrder.mockResolvedValue({
      ...externalResource,
      total_amount: 'not-a-number',
      created_date: 'not-a-date',
    });

    await expect(
      service.create(ticketId, dto, actorId, 'invalid-external-order'),
    ).rejects.toThrow('invalid field values');
  });

  it('lists and retrieves local Orders and reports missing records', async () => {
    const local = makeStored();
    prismaMock.mercadoPagoOrder.findMany.mockResolvedValue([local]);

    await expect(service.findByTicket(ticketId)).resolves.toEqual([
      expect.objectContaining({ externalOrderId: externalResource.id }),
    ]);
    expect(salesMock.findOne).toHaveBeenCalledWith(ticketId);
    expect(prismaMock.mercadoPagoOrder.findMany).toHaveBeenCalledWith({
      where: { saleTicketId: ticketId },
      orderBy: { createdAt: 'desc' },
    });

    stored = local;
    await expect(service.findOne(String(local.id))).resolves.toEqual(
      expect.objectContaining({ saleTicketId: ticketId }),
    );
    stored = null;
    await expect(
      service.findOne('9f4c0bb0-5a94-4fe0-838b-6c809aaf65af'),
    ).rejects.toThrow('was not found');
  });

  it('refreshes by external id and rejects unknown Webhook Orders', async () => {
    stored = makeStored({
      status: 'pending',
      statusDetail: 'pending_contingency',
      paymentStatus: 'pending',
      paymentStatusDetail: 'pending_contingency',
    });
    clientMock.getOrder.mockResolvedValue({
      ...externalResource,
      status: 'pending',
      status_detail: 'pending_contingency',
      total_paid_amount: null,
      transactions: {
        payments: [
          {
            ...externalResource.transactions.payments[0],
            status: 'pending',
            status_detail: 'pending_contingency',
          },
        ],
      },
    });

    await expect(
      service.refreshByExternalId(externalResource.id),
    ).resolves.toEqual(expect.objectContaining({ status: 'pending' }));
    expect(salesMock.confirm).not.toHaveBeenCalled();

    prismaMock.mercadoPagoOrder.findUnique.mockResolvedValueOnce(null);
    await expect(service.refreshByExternalId('ORD-UNKNOWN')).rejects.toThrow(
      'was not found locally',
    );
  });

  it('treats an already confirmed Mercado Pago ticket as reconciled', async () => {
    stored = makeStored();
    salesMock.findOne.mockResolvedValue({
      id: ticketId,
      status: SaleTicketStatus.CONFIRMED,
      paymentMethod: SalePaymentMethod.MERCADO_PAGO,
    });
    clientMock.getOrder.mockResolvedValue(externalResource);

    const result = await service.refresh(String(stored.id));

    expect(result.reconciledAt).toBeInstanceOf(Date);
    expect(result.reconciliationError).toBeNull();
    expect(salesMock.confirm).not.toHaveBeenCalled();
  });

  it('records operational errors when an accredited payment cannot confirm', async () => {
    stored = makeStored({ createdById: null });
    clientMock.getOrder.mockResolvedValue(externalResource);
    let result = await service.refresh(String(stored.id));
    expect(result.reconciliationError).toContain('no internal actor');

    stored = makeStored();
    salesMock.findOne.mockResolvedValue({
      id: ticketId,
      status: SaleTicketStatus.CONFIRMED,
      paymentMethod: SalePaymentMethod.CASH,
    });
    result = await service.refresh(String(stored.id));
    expect(result.reconciliationError).toContain('payment method CASH');

    stored = makeStored();
    salesMock.findOne.mockResolvedValue({
      id: ticketId,
      status: SaleTicketStatus.DRAFT,
      paymentMethod: null,
    });
    salesMock.confirm.mockRejectedValue(
      new Error('Insufficient stock to confirm paid ticket.'),
    );
    result = await service.refresh(String(stored.id));
    expect(result.reconciliationError).toBe(
      'Insufficient stock to confirm paid ticket.',
    );
  });
});
