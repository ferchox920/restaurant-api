import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MercadoPagoController } from './mercado-pago.controller';
import { MercadoPagoService } from './mercado-pago.service';

describe('MercadoPagoController', () => {
  const service = {
    syncPayments: jest.fn(),
    findAll: jest.fn(),
  };
  const controller = new MercadoPagoController(
    service as unknown as MercadoPagoService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('applies authentication guards and the intended roles', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MercadoPagoController)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );
    expect(Reflect.getMetadata(ROLES_KEY, controller.sync)).toEqual([
      'ADMIN',
      'MANAGER',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
  });

  it('delegates sync and listing queries to the service', async () => {
    const syncQuery = { from: '2026-06-01T00:00:00.000Z' };
    service.syncPayments.mockResolvedValue({ fetched: 0 });
    await expect(controller.sync(syncQuery)).resolves.toEqual({ fetched: 0 });
    expect(service.syncPayments).toHaveBeenCalledWith(syncQuery);

    const listQuery = { status: 'approved', limit: 10, offset: 0 };
    service.findAll.mockResolvedValue({ items: [], total: 0 });
    await expect(controller.findAll(listQuery)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(service.findAll).toHaveBeenCalledWith(listQuery);
  });
});
