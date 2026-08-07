import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

describe('MercadoPagoWebhookController', () => {
  const service = { handleOrder: jest.fn() };
  const controller = new MercadoPagoWebhookController(
    service as unknown as MercadoPagoWebhookService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('remains public so Mercado Pago can deliver signed notifications', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MercadoPagoWebhookController),
    ).toBeUndefined();
  });

  it('forwards the unmodified signature inputs and notification body', async () => {
    const body = {
      action: 'order.processed',
      live_mode: false,
      type: 'order',
      data: { id: 'ORD01TEST' },
    };
    service.handleOrder.mockResolvedValue({ received: true });

    await expect(
      controller.handleOrder('ts=1,v1=hash', 'request-1', 'ORD01TEST', body),
    ).resolves.toEqual({ received: true });
    expect(service.handleOrder).toHaveBeenCalledWith({
      xSignature: 'ts=1,v1=hash',
      xRequestId: 'request-1',
      dataId: 'ORD01TEST',
      body,
    });
  });
});
import { GUARDS_METADATA } from '@nestjs/common/constants';
