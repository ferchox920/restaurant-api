import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MercadoPagoOrderPreviewController } from './mercado-pago-order-preview.controller';
import { MercadoPagoOrderPreviewService } from './mercado-pago-order-preview.service';

describe('MercadoPagoOrderPreviewController', () => {
  const service = { preview: jest.fn() };
  const controller = new MercadoPagoOrderPreviewController(
    service as unknown as MercadoPagoOrderPreviewService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('applies authentication guards and read roles', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MercadoPagoOrderPreviewController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.preview)).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
  });

  it('delegates the ticket id to the preview service', async () => {
    const result = {
      ticketId: '7b359be0-ce70-4bd3-bb19-a921c4e232d6',
      ticketNumber: 1001,
      payload: { items: [] },
    };
    service.preview.mockResolvedValue(result);

    await expect(controller.preview(result.ticketId)).resolves.toBe(result);
    expect(service.preview).toHaveBeenCalledWith(result.ticketId);
  });
});
