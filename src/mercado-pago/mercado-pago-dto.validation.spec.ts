import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMercadoPagoOrderDto } from './dto/create-mercado-pago-order.dto';
import { MercadoPagoWebhookDto } from './dto/mercado-pago-webhook.dto';

describe('Mercado Pago DTO validation', () => {
  const validOrder = {
    cardToken: 'one-use-token',
    paymentMethodId: 'master',
    paymentTypeId: 'credit_card',
    installments: 1,
    payerEmail: 'buyer@testuser.com',
  };

  async function validateOrder(value: Record<string, unknown>) {
    return validate(plainToInstance(CreateMercadoPagoOrderDto, value), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('accepts the minimal card payload and a complete payer identity', async () => {
    await expect(validateOrder(validOrder)).resolves.toHaveLength(0);
    await expect(
      validateOrder({
        ...validOrder,
        paymentTypeId: 'debit_card',
        payerFirstName: 'Maria',
        payerLastName: 'Gonzalez',
        identificationType: 'DNI',
        identificationNumber: '12345678',
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    [{ ...validOrder, cardToken: '' }, 'cardToken'],
    [{ ...validOrder, paymentTypeId: 'cash' }, 'paymentTypeId'],
    [{ ...validOrder, installments: 0 }, 'installments'],
    [{ ...validOrder, installments: 37 }, 'installments'],
    [{ ...validOrder, payerEmail: 'invalid' }, 'payerEmail'],
    [{ ...validOrder, identificationType: 'DNI' }, 'identificationNumber'],
    [{ ...validOrder, totalAmount: '1.00' }, 'totalAmount'],
  ])('rejects unsafe order input at %s', async (input, property) => {
    const errors = await validateOrder(input as Record<string, unknown>);
    expect(errors.some((error) => error.property === property)).toBe(true);
  });

  it('validates the complete Webhook envelope and rejects nested invalid data', async () => {
    const valid = plainToInstance(MercadoPagoWebhookDto, {
      action: 'order.processed',
      api_version: 'v1',
      application_id: '123',
      date_created: '2026-08-06T12:00:00.000Z',
      id: 'notification-1',
      live_mode: false,
      type: 'order',
      user_id: 123,
      data: { id: 'ORD01TEST' },
    });
    await expect(
      validate(valid, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);

    const invalid = plainToInstance(MercadoPagoWebhookDto, {
      action: 'order.processed',
      live_mode: 'false',
      type: 'order',
      data: { id: 123 },
    });
    const errors = await validate(invalid, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['live_mode', 'data']),
    );
  });
});
