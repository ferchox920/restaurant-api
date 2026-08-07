import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { MercadoPagoOrdersController } from './mercado-pago-orders.controller';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';

describe('MercadoPagoOrdersController', () => {
  const orders = {
    create: jest.fn(),
    findByTicket: jest.fn(),
    findOne: jest.fn(),
    refresh: jest.fn(),
  };
  const idempotency = {
    execute: jest.fn(async (input: { run: () => Promise<unknown> }) =>
      input.run(),
    ),
  };
  const controller = new MercadoPagoOrdersController(
    orders as unknown as MercadoPagoOrdersService,
    idempotency as unknown as IdempotencyService,
  );
  const user = { id: 'user-id' } as AuthenticatedUser;

  beforeEach(() => jest.clearAllMocks());

  it('protects write and read operations with the intended roles', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MercadoPagoOrdersController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findByTicket)).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.refresh)).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
    ]);
  });

  it('wraps creation with internal and external idempotency', async () => {
    const dto = {
      cardToken: 'card-token',
      paymentMethodId: 'master',
      paymentTypeId: 'credit_card' as const,
      installments: 1,
      payerEmail: 'buyer@testuser.com',
    };
    orders.create.mockResolvedValue({ externalOrderId: 'ORD01TEST' });

    await expect(
      controller.create('ticket-id', dto, user, 'attempt-1'),
    ).resolves.toEqual({ externalOrderId: 'ORD01TEST' });
    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'attempt-1',
        userId: user.id,
        operation: 'mercado-pago.order.create:ticket-id',
        body: dto,
      }),
    );
    expect(orders.create).toHaveBeenCalledWith(
      'ticket-id',
      dto,
      user.id,
      'attempt-1',
    );
  });

  it('delegates listing, lookup and refresh without changing identifiers', async () => {
    orders.findByTicket.mockResolvedValue([]);
    orders.findOne.mockResolvedValue({ id: 'order-id' });
    orders.refresh.mockResolvedValue({ id: 'order-id', status: 'processed' });

    await expect(controller.findByTicket('ticket-id')).resolves.toEqual([]);
    await expect(controller.findOne('order-id')).resolves.toEqual({
      id: 'order-id',
    });
    await expect(controller.refresh('order-id')).resolves.toEqual({
      id: 'order-id',
      status: 'processed',
    });
    expect(orders.findByTicket).toHaveBeenCalledWith('ticket-id');
    expect(orders.findOne).toHaveBeenCalledWith('order-id');
    expect(orders.refresh).toHaveBeenCalledWith('order-id');
  });
});
