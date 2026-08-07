import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { MercadoPagoOrdersController } from './mercado-pago-orders.controller';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

describe('Mercado Pago HTTP contract', () => {
  const ticketId = '5b4c0bb0-5a94-4fe0-838b-6c809aaf65af';
  const orders = {
    create: jest.fn(),
    findByTicket: jest.fn(),
    findOne: jest.fn(),
    refresh: jest.fn(),
  };
  const webhook = { handleOrder: jest.fn() };
  const idempotency = {
    execute: jest.fn(async (input: { run: () => Promise<unknown> }) =>
      input.run(),
    ),
  };
  const authenticatedGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      request.user = { id: 'cashier-id', role: 'CASHIER', active: true };
      return true;
    },
  };
  const allowedRolesGuard: CanActivate = { canActivate: () => true };
  let moduleRef: TestingModule;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [MercadoPagoOrdersController, MercadoPagoWebhookController],
      providers: [
        { provide: MercadoPagoOrdersService, useValue: orders },
        { provide: MercadoPagoWebhookService, useValue: webhook },
        { provide: IdempotencyService, useValue: idempotency },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authenticatedGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowedRolesGuard)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    orders.create.mockResolvedValue({
      id: '7d4c0bb0-5a94-4fe0-838b-6c809aaf65af',
      saleTicketId: ticketId,
      externalOrderId: 'ORD01TEST',
      status: 'processed',
    });
    webhook.handleOrder.mockResolvedValue({
      received: true,
      externalOrderId: 'ORD01TEST',
      status: 'processed',
      reconciliationError: null,
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  it('accepts a valid card request and forwards its idempotency key', async () => {
    const response = await fetch(
      `${baseUrl}/api/integrations/mercado-pago/tickets/${ticketId}/orders`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'attempt-http-1',
        },
        body: JSON.stringify({
          cardToken: 'one-use-token',
          paymentMethodId: 'master',
          paymentTypeId: 'credit_card',
          installments: 1,
          payerEmail: 'buyer@testuser.com',
        }),
      },
    );
    const result = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(result.externalOrderId).toBe('ORD01TEST');
    expect(orders.create).toHaveBeenCalledWith(
      ticketId,
      expect.objectContaining({ payerEmail: 'buyer@testuser.com' }),
      'cashier-id',
      'attempt-http-1',
    );
  });

  it.each([
    {
      cardToken: '',
      paymentMethodId: 'master',
      paymentTypeId: 'credit_card',
      installments: 1,
      payerEmail: 'buyer@testuser.com',
    },
    {
      cardToken: 'one-use-token',
      paymentMethodId: 'master',
      paymentTypeId: 'cash',
      installments: 1,
      payerEmail: 'buyer@testuser.com',
    },
    {
      cardToken: 'one-use-token',
      paymentMethodId: 'master',
      paymentTypeId: 'credit_card',
      installments: 1,
      payerEmail: 'buyer@testuser.com',
      totalAmount: '0.01',
    },
  ])('rejects unsafe card payloads before the service', async (body) => {
    const response = await fetch(
      `${baseUrl}/api/integrations/mercado-pago/tickets/${ticketId}/orders`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'attempt-invalid',
        },
        body: JSON.stringify(body),
      },
    );

    expect(response.status).toBe(400);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('accepts the official Webhook envelope without JWT', async () => {
    const response = await fetch(
      `${baseUrl}/api/integrations/mercado-pago/webhooks/orders?data.id=ORD01TEST`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': 'ts=1,v1=hash',
          'x-request-id': 'request-http-1',
        },
        body: JSON.stringify({
          action: 'order.processed',
          api_version: 'v1',
          application_id: '123',
          date_created: '2026-08-06T12:00:00.000Z',
          id: 'notification-1',
          live_mode: false,
          type: 'order',
          user_id: 123,
          data: { id: 'ORD01TEST' },
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(webhook.handleOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        xSignature: 'ts=1,v1=hash',
        xRequestId: 'request-http-1',
        dataId: 'ORD01TEST',
      }),
    );
  });

  it('rejects malformed Webhooks before signature processing', async () => {
    const response = await fetch(
      `${baseUrl}/api/integrations/mercado-pago/webhooks/orders?data.id=ORD01TEST`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'order.processed',
          live_mode: 'false',
          type: 'order',
          data: { id: 123 },
          unexpected: true,
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(webhook.handleOrder).not.toHaveBeenCalled();
  });
});
