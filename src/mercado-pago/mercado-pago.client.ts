import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoOrderCreatePayload,
  MercadoPagoOrderResource,
  MercadoPagoPaymentResource,
  MercadoPagoPaymentsPage,
} from './mercado-pago.types';

const MERCADO_PAGO_API_URL = 'https://api.mercadopago.com';

@Injectable()
export class MercadoPagoClient {
  constructor(private readonly config: ConfigService) {}

  async searchPayments(input: {
    from: Date;
    to: Date;
    limit: number;
    offset: number;
  }): Promise<MercadoPagoPaymentsPage> {
    if (!this.config.get<boolean>('MERCADO_PAGO_ENABLED')) {
      throw new ServiceUnavailableException(
        'Mercado Pago integration is disabled.',
      );
    }

    const accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new ServiceUnavailableException(
        'Mercado Pago integration is not configured.',
      );
    }

    const url = new URL('/v1/payments/search', MERCADO_PAGO_API_URL);
    url.searchParams.set('sort', 'date_created');
    url.searchParams.set('criteria', 'asc');
    url.searchParams.set('range', 'date_created');
    url.searchParams.set('begin_date', input.from.toISOString());
    url.searchParams.set('end_date', input.to.toISOString());
    url.searchParams.set('limit', String(input.limit));
    url.searchParams.set('offset', String(input.offset));

    const timeoutMs = this.config.get<number>('HTTP_TIMEOUT_MS') ?? 10_000;
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'request timed out'
          : 'request failed';
      throw new BadGatewayException(`Mercado Pago ${reason}.`);
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Mercado Pago request failed with status ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('Mercado Pago returned invalid JSON.');
    }

    if (!this.isPaymentsPage(payload)) {
      throw new BadGatewayException(
        'Mercado Pago returned an invalid payments response.',
      );
    }

    return payload;
  }

  async createOrder(input: {
    payload: MercadoPagoOrderCreatePayload;
    idempotencyKey: string;
  }): Promise<MercadoPagoOrderResource> {
    return this.requestOrder('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify(input.payload),
    });
  }

  async getOrder(externalOrderId: string): Promise<MercadoPagoOrderResource> {
    return this.requestOrder(
      `/v1/orders/${encodeURIComponent(externalOrderId)}`,
      { method: 'GET' },
    );
  }

  private async requestOrder(
    path: string,
    init: RequestInit,
  ): Promise<MercadoPagoOrderResource> {
    if (!this.config.get<boolean>('MERCADO_PAGO_ENABLED')) {
      throw new ServiceUnavailableException(
        'Mercado Pago integration is disabled.',
      );
    }

    const accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new ServiceUnavailableException(
        'Mercado Pago integration is not configured.',
      );
    }

    const timeoutMs = this.config.get<number>('HTTP_TIMEOUT_MS') ?? 10_000;
    let response: Response;
    try {
      response = await fetch(new URL(path, MERCADO_PAGO_API_URL), {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...init.headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'request timed out'
          : 'request failed';
      throw new BadGatewayException(`Mercado Pago ${reason}.`);
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Mercado Pago order request failed with status ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('Mercado Pago returned invalid JSON.');
    }

    if (!this.isOrderResource(payload)) {
      throw new BadGatewayException(
        'Mercado Pago returned an invalid order response.',
      );
    }
    return payload;
  }

  private isPaymentsPage(value: unknown): value is MercadoPagoPaymentsPage {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const page = value as Record<string, unknown>;
    if (!Array.isArray(page.results) || !page.paging) {
      return false;
    }

    const paging = page.paging as Record<string, unknown>;
    return (
      typeof paging.total === 'number' &&
      typeof paging.limit === 'number' &&
      typeof paging.offset === 'number' &&
      page.results.every((result) => this.isPaymentResource(result))
    );
  }

  private isPaymentResource(
    value: unknown,
  ): value is MercadoPagoPaymentResource {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payment = value as Record<string, unknown>;
    const transactionDetails = payment.transaction_details;
    const validTransactionDetails =
      transactionDetails == null ||
      (typeof transactionDetails === 'object' &&
        this.isOptionalNumberLike(
          (transactionDetails as Record<string, unknown>).net_received_amount,
        ));

    return (
      (typeof payment.id === 'string' || typeof payment.id === 'number') &&
      this.isNumberLike(payment.transaction_amount) &&
      this.isOptionalNumberLike(payment.transaction_amount_refunded) &&
      typeof payment.currency_id === 'string' &&
      typeof payment.status === 'string' &&
      this.isOptionalString(payment.status_detail) &&
      this.isOptionalString(payment.payment_method_id) &&
      this.isOptionalString(payment.payment_type_id) &&
      (payment.installments == null ||
        (typeof payment.installments === 'number' &&
          Number.isInteger(payment.installments))) &&
      this.isOptionalString(payment.external_reference) &&
      this.isOptionalString(payment.description) &&
      typeof payment.live_mode === 'boolean' &&
      typeof payment.date_created === 'string' &&
      this.isOptionalString(payment.date_approved) &&
      typeof payment.date_last_updated === 'string' &&
      validTransactionDetails
    );
  }

  private isOrderResource(value: unknown): value is MercadoPagoOrderResource {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const order = value as Record<string, unknown>;
    const transactions = order.transactions;
    const payments =
      transactions && typeof transactions === 'object'
        ? (transactions as Record<string, unknown>).payments
        : undefined;
    const validPayments =
      payments == null ||
      (Array.isArray(payments) &&
        payments.every((payment) => {
          if (!payment || typeof payment !== 'object') return false;
          const record = payment as Record<string, unknown>;
          return (
            this.isOptionalString(record.id) &&
            this.isOptionalNumberLike(record.amount) &&
            this.isOptionalNumberLike(record.paid_amount) &&
            this.isOptionalString(record.status) &&
            this.isOptionalString(record.status_detail)
          );
        }));

    return (
      typeof order.id === 'string' &&
      typeof order.type === 'string' &&
      typeof order.status === 'string' &&
      this.isNumberLike(order.total_amount) &&
      this.isOptionalNumberLike(order.total_paid_amount) &&
      this.isOptionalString(order.status_detail) &&
      this.isOptionalString(order.external_reference) &&
      this.isOptionalString(order.currency) &&
      this.isOptionalString(order.created_date) &&
      this.isOptionalString(order.last_updated_date) &&
      this.isOptionalString(order.checkout_url) &&
      validPayments
    );
  }

  private isNumberLike(value: unknown): value is string | number {
    return typeof value === 'string' || typeof value === 'number';
  }

  private isOptionalNumberLike(
    value: unknown,
  ): value is string | number | null | undefined {
    return value == null || this.isNumberLike(value);
  }

  private isOptionalString(value: unknown): value is string | null | undefined {
    return value == null || typeof value === 'string';
  }
}
