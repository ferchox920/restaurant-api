import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoClient } from './mercado-pago.client';

describe('MercadoPagoClient', () => {
  const originalFetch = global.fetch;
  const configValues: Record<string, unknown> = {
    MERCADO_PAGO_ENABLED: true,
    MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR-secret-token',
    HTTP_TIMEOUT_MS: 5000,
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  } as unknown as ConfigService;
  let client: MercadoPagoClient;

  beforeEach(() => {
    jest.clearAllMocks();
    configValues.MERCADO_PAGO_ENABLED = true;
    configValues.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-secret-token';
    client = new MercadoPagoClient(config);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('searches payments with the token, date range and pagination', async () => {
    const payload = {
      paging: { total: 0, limit: 100, offset: 0 },
      results: [],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    await expect(
      client.searchPayments({
        from: new Date('2026-06-01T00:00:00.000Z'),
        to: new Date('2026-07-01T00:00:00.000Z'),
        limit: 100,
        offset: 200,
      }),
    ).resolves.toEqual(payload);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(url.origin + url.pathname).toBe(
      'https://api.mercadopago.com/v1/payments/search',
    );
    expect(url.searchParams.get('sort')).toBe('date_created');
    expect(url.searchParams.get('criteria')).toBe('asc');
    expect(url.searchParams.get('begin_date')).toBe('2026-06-01T00:00:00.000Z');
    expect(url.searchParams.get('limit')).toBe('100');
    expect(url.searchParams.get('offset')).toBe('200');
    expect(options.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer APP_USR-secret-token',
    });
  });

  it('rejects calls while the integration is disabled', async () => {
    configValues.MERCADO_PAGO_ENABLED = false;

    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    await expect(client.getOrder('ORD01TEST')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects payment and Order calls when the access token is absent', async () => {
    configValues.MERCADO_PAGO_ACCESS_TOKEN = '';
    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toThrow('integration is not configured');
    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'integration is not configured',
    );
  });

  it('maps timeouts and upstream errors to bad gateway without token details', async () => {
    const timeout = new Error('APP_USR-secret-token');
    timeout.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeout);

    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toThrow('Mercado Pago request timed out.');

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BadGatewayException>>({
        message: 'Mercado Pago request failed with status 401.',
      }),
    );
  });

  it('rejects invalid JSON and malformed payment responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError('invalid')),
    });
    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toThrow('Mercado Pago returned invalid JSON.');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ paging: {}, results: [{}] }),
    });
    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toThrow('Mercado Pago returned an invalid payments response.');
  });

  it('rejects invalid optional payment fields before persistence', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        paging: { total: 1, limit: 100, offset: 0 },
        results: [
          {
            id: 1,
            transaction_amount: 100,
            currency_id: 'ARS',
            status: 'approved',
            status_detail: 123,
            installments: 'one',
            live_mode: true,
            date_created: '2026-07-01T00:00:00.000Z',
            date_last_updated: '2026-07-01T00:00:00.000Z',
          },
        ],
      }),
    });

    await expect(
      client.searchPayments({
        from: new Date(),
        to: new Date(),
        limit: 100,
        offset: 0,
      }),
    ).rejects.toThrow('Mercado Pago returned an invalid payments response.');
  });

  it('creates and retrieves Orders with authorization and idempotency', async () => {
    const order = {
      id: 'ORD01TEST',
      type: 'online',
      status: 'processed',
      status_detail: 'accredited',
      total_amount: '1500.00',
      total_paid_amount: '1500.00',
      external_reference: 'ticket-id',
      transactions: { payments: [] },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(order),
    });
    const payload = {
      type: 'online' as const,
      processing_mode: 'automatic' as const,
      capture_mode: 'automatic' as const,
      external_reference: 'ticket-id',
      description: 'Ticket #42',
      total_amount: '1500.00',
      currency: 'ARS',
      payer: { email: 'buyer@testuser.com' },
      transactions: {
        payments: [
          {
            amount: '1500.00',
            payment_method: {
              id: 'master',
              type: 'credit_card',
              token: 'one-use-token',
              installments: 1,
            },
          },
        ],
      },
      items: [],
    };

    await expect(
      client.createOrder({ payload, idempotencyKey: 'attempt-1' }),
    ).resolves.toEqual(order);
    let [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(url.pathname).toBe('/v1/orders');
    expect(options.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer APP_USR-secret-token',
        'X-Idempotency-Key': 'attempt-1',
      }),
    );
    expect(JSON.parse(String(options.body))).toEqual(payload);

    await client.getOrder('ORD01TEST');
    [url, options] = (global.fetch as jest.Mock).mock.calls[1] as [
      URL,
      RequestInit,
    ];
    expect(url.pathname).toBe('/v1/orders/ORD01TEST');
    expect(options.method).toBe('GET');
  });

  it('rejects malformed Order responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'ORD01TEST' }),
    });

    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'Mercado Pago returned an invalid order response.',
    );
  });

  it('maps Order timeouts, network failures and upstream status safely', async () => {
    const timeout = new Error('secret must not leak');
    timeout.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeout);
    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'Mercado Pago request timed out.',
    );

    global.fetch = jest.fn().mockRejectedValue('network down');
    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'Mercado Pago request failed.',
    );

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'order request failed with status 429',
    );
  });

  it('rejects invalid JSON and malformed nested Order payments', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError('invalid')),
    });
    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'Mercado Pago returned invalid JSON.',
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'ORD01TEST',
        type: 'online',
        status: 'processed',
        total_amount: '1500.00',
        transactions: { payments: [{ status: 123 }] },
      }),
    });
    await expect(client.getOrder('ORD01TEST')).rejects.toThrow(
      'Mercado Pago returned an invalid order response.',
    );
  });

  it('URL-encodes external Order identifiers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'ORD/with spaces',
        type: 'online',
        status: 'pending',
        total_amount: 100,
      }),
    });

    await client.getOrder('ORD/with spaces');

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
    expect(url.pathname).toBe('/v1/orders/ORD%2Fwith%20spaces');
  });
});
