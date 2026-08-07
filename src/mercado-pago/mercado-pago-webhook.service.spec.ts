import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import {
  InvalidWebhookSignatureError,
  SignatureFailureReason,
  WebhookSignatureValidator,
} from 'mercadopago';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

describe('MercadoPagoWebhookService', () => {
  const body = {
    action: 'order.processed',
    live_mode: false,
    type: 'order',
    data: { id: 'ORD01TEST' },
  };
  const configValues: Record<string, unknown> = {};
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  };
  const orders = {
    refreshByExternalId: jest.fn(),
  };
  let service: MercadoPagoWebhookService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    configValues.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret';
    configValues.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS = 300;
    service = new MercadoPagoWebhookService(
      config as unknown as ConfigService,
      orders as unknown as MercadoPagoOrdersService,
    );
  });

  it('validates the signature and refreshes the notified order', async () => {
    jest.spyOn(WebhookSignatureValidator, 'validate').mockReturnValue();
    orders.refreshByExternalId.mockResolvedValue({
      externalOrderId: 'ORD01TEST',
      status: 'processed',
      reconciliationError: null,
    });

    await expect(
      service.handleOrder({
        xSignature: 'ts=1,v1=hash',
        xRequestId: 'request-1',
        dataId: 'ORD01TEST',
        body,
      }),
    ).resolves.toEqual({
      received: true,
      externalOrderId: 'ORD01TEST',
      status: 'processed',
      reconciliationError: null,
    });
    expect(WebhookSignatureValidator.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        dataId: 'ORD01TEST',
        secret: 'webhook-secret',
        toleranceSeconds: 300,
      }),
    );
  });

  it('rejects mismatched identifiers and invalid signatures', async () => {
    await expect(
      service.handleOrder({ dataId: 'OTHER', body }),
    ).rejects.toBeInstanceOf(BadRequestException);

    jest.spyOn(WebhookSignatureValidator, 'validate').mockImplementation(() => {
      throw new InvalidWebhookSignatureError(
        SignatureFailureReason.SignatureMismatch,
      );
    });
    await expect(
      service.handleOrder({
        xSignature: 'ts=1,v1=bad',
        xRequestId: 'request-1',
        dataId: 'ORD01TEST',
        body,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(orders.refreshByExternalId).not.toHaveBeenCalled();
  });

  it('validates a real HMAC signature with the official SDK', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = 'request-real-signature';
    const manifest = `id:ORD01TEST;request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac('sha256', 'webhook-secret')
      .update(manifest)
      .digest('hex');
    orders.refreshByExternalId.mockResolvedValue({
      externalOrderId: 'ORD01TEST',
      status: 'processed',
      reconciliationError: null,
    });

    await expect(
      service.handleOrder({
        xSignature: `ts=${timestamp},v1=${hash}`,
        xRequestId: requestId,
        dataId: 'ORD01TEST',
        body,
      }),
    ).resolves.toEqual(expect.objectContaining({ received: true }));
  });

  it('fails closed when the secret is absent or the event is not an Order', async () => {
    configValues.MERCADO_PAGO_WEBHOOK_SECRET = '   ';
    await expect(
      service.handleOrder({ dataId: 'ORD01TEST', body }),
    ).rejects.toThrow('webhook is not configured');

    configValues.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret';
    await expect(
      service.handleOrder({
        dataId: 'ORD01TEST',
        body: { ...body, type: 'payment' },
      }),
    ).rejects.toThrow('Only Mercado Pago order events are accepted');
  });

  it('uses the safe default tolerance and does not hide unexpected errors', async () => {
    delete configValues.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS;
    const validateSpy = jest
      .spyOn(WebhookSignatureValidator, 'validate')
      .mockImplementation(() => {
        throw new Error('unexpected validator failure');
      });

    await expect(
      service.handleOrder({
        xSignature: 'ts=1,v1=hash',
        xRequestId: 'request-1',
        dataId: 'ORD01TEST',
        body,
      }),
    ).rejects.toThrow('unexpected validator failure');
    expect(validateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ toleranceSeconds: 300 }),
    );
  });
});
