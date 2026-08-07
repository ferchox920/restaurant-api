import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SalePaymentMethod, SaleTicketStatus } from '../sales/sales.enums';
import { SalesService } from '../sales/sales.service';
import { CreateMercadoPagoOrderDto } from './dto/create-mercado-pago-order.dto';
import { MercadoPagoOrderResponseDto } from './dto/mercado-pago-order-response.dto';
import { MercadoPagoClient } from './mercado-pago.client';
import { toMercadoPagoOrderResponse } from './mercado-pago-order.mapper';
import { MercadoPagoOrderPreviewService } from './mercado-pago-order-preview.service';
import { MercadoPagoOrderResource } from './mercado-pago.types';

@Injectable()
export class MercadoPagoOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MercadoPagoClient,
    private readonly previewService: MercadoPagoOrderPreviewService,
    private readonly salesService: SalesService,
    private readonly config: ConfigService,
  ) {}

  async create(
    ticketId: string,
    dto: CreateMercadoPagoOrderDto,
    createdById: string,
    rawIdempotencyKey?: string,
  ): Promise<MercadoPagoOrderResponseDto> {
    const idempotencyKey = this.validateIdempotencyKey(rawIdempotencyKey);
    const existing = await this.prisma.mercadoPagoOrder.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.saleTicketId !== ticketId) {
        throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED' });
      }
      return toMercadoPagoOrderResponse(existing);
    }

    const preview = await this.previewService.preview(ticketId);
    const currency = this.config.get<string>('MERCADO_PAGO_CURRENCY') ?? 'ARS';
    const statementDescriptor = this.config
      .get<string>('MERCADO_PAGO_STATEMENT_DESCRIPTOR')
      ?.trim();
    const payer = {
      email: dto.payerEmail,
      ...(dto.payerFirstName ? { first_name: dto.payerFirstName } : {}),
      ...(dto.payerLastName ? { last_name: dto.payerLastName } : {}),
      ...(dto.identificationType && dto.identificationNumber
        ? {
            identification: {
              type: dto.identificationType,
              number: dto.identificationNumber,
            },
          }
        : {}),
    };
    const resource = await this.client.createOrder({
      idempotencyKey,
      payload: {
        ...preview.payload,
        capture_mode: 'automatic',
        currency,
        payer,
        transactions: {
          payments: [
            {
              amount: preview.payload.total_amount,
              payment_method: {
                id: dto.paymentMethodId,
                type: dto.paymentTypeId,
                token: dto.cardToken,
                installments: dto.installments,
                ...(statementDescriptor
                  ? { statement_descriptor: statementDescriptor }
                  : {}),
              },
            },
          ],
        },
      },
    });
    this.ensureResourceMatchesTicket(resource, ticketId);

    const order = await this.prisma.mercadoPagoOrder.create({
      data: {
        ...this.toPersistenceData(resource, {
          currencyId: currency,
          paymentMethodId: dto.paymentMethodId,
          paymentTypeId: dto.paymentTypeId,
          installments: dto.installments,
        }),
        saleTicketId: ticketId,
        idempotencyKey,
        createdById,
      },
    });

    return this.reconcile(order.id);
  }

  async findByTicket(ticketId: string): Promise<MercadoPagoOrderResponseDto[]> {
    await this.salesService.findOne(ticketId);
    const orders = await this.prisma.mercadoPagoOrder.findMany({
      where: { saleTicketId: ticketId },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toMercadoPagoOrderResponse);
  }

  async findOne(id: string): Promise<MercadoPagoOrderResponseDto> {
    return toMercadoPagoOrderResponse(await this.getOrderOrThrow(id));
  }

  async refresh(id: string): Promise<MercadoPagoOrderResponseDto> {
    const stored = await this.getOrderOrThrow(id);
    const resource = await this.client.getOrder(stored.externalOrderId);
    this.ensureResourceMatchesTicket(resource, stored.saleTicketId);
    await this.prisma.mercadoPagoOrder.update({
      where: { id },
      data: this.toPersistenceData(resource, {
        currencyId: stored.currencyId,
        paymentMethodId: stored.paymentMethodId,
        paymentTypeId: stored.paymentTypeId,
        installments: stored.installments,
      }),
    });
    return this.reconcile(id);
  }

  async refreshByExternalId(
    externalOrderId: string,
  ): Promise<MercadoPagoOrderResponseDto> {
    const stored = await this.prisma.mercadoPagoOrder.findUnique({
      where: { externalOrderId },
    });
    if (!stored) {
      throw new NotFoundException(
        `Mercado Pago order "${externalOrderId}" was not found locally.`,
      );
    }
    return this.refresh(stored.id);
  }

  private async reconcile(id: string): Promise<MercadoPagoOrderResponseDto> {
    const order = await this.getOrderOrThrow(id);
    const approved =
      (order.status === 'processed' && order.statusDetail === 'accredited') ||
      (order.paymentStatus === 'processed' &&
        order.paymentStatusDetail === 'accredited');
    const refunded =
      order.status === 'refunded' || order.paymentStatus === 'refunded';

    if (refunded) {
      return this.setReconciliationResult(
        id,
        null,
        'Mercado Pago reports a refund. The confirmed ticket must be reviewed and voided manually if applicable.',
      );
    }

    if (!approved) {
      return toMercadoPagoOrderResponse(order);
    }

    try {
      const ticket = await this.salesService.findOne(order.saleTicketId);
      if (ticket.status === SaleTicketStatus.DRAFT) {
        if (!order.createdById) {
          throw new ConflictException(
            'The paid order has no internal actor available to confirm the ticket.',
          );
        }
        await this.salesService.confirm(
          order.saleTicketId,
          { paymentMethod: SalePaymentMethod.MERCADO_PAGO },
          order.createdById,
        );
      } else if (
        ticket.status !== SaleTicketStatus.CONFIRMED ||
        ticket.paymentMethod !== SalePaymentMethod.MERCADO_PAGO
      ) {
        throw new ConflictException(
          `The paid order is linked to a ticket in ${ticket.status} with payment method ${ticket.paymentMethod ?? 'NONE'}.`,
        );
      }

      return this.setReconciliationResult(id, new Date(), null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'The paid order could not confirm its sale ticket.';
      return this.setReconciliationResult(id, null, message.slice(0, 1000));
    }
  }

  private async setReconciliationResult(
    id: string,
    reconciledAt: Date | null,
    reconciliationError: string | null,
  ): Promise<MercadoPagoOrderResponseDto> {
    const updated = await this.prisma.mercadoPagoOrder.update({
      where: { id },
      data: { reconciledAt, reconciliationError },
    });
    return toMercadoPagoOrderResponse(updated);
  }

  private toPersistenceData(
    resource: MercadoPagoOrderResource,
    fallback: {
      currencyId: string;
      paymentMethodId: string | null;
      paymentTypeId: string | null;
      installments: number | null;
    },
  ): Omit<
    Prisma.MercadoPagoOrderUncheckedCreateInput,
    'saleTicketId' | 'idempotencyKey'
  > {
    try {
      const payment = resource.transactions?.payments?.[0];
      const paymentMethod = payment?.payment_method;
      return {
        externalOrderId: resource.id,
        status: resource.status,
        statusDetail: resource.status_detail ?? null,
        totalAmount: new Prisma.Decimal(resource.total_amount),
        totalPaidAmount:
          resource.total_paid_amount == null
            ? null
            : new Prisma.Decimal(resource.total_paid_amount),
        currencyId: resource.currency ?? fallback.currencyId,
        paymentId: payment?.id ?? null,
        paymentStatus: payment?.status ?? null,
        paymentStatusDetail: payment?.status_detail ?? null,
        paymentMethodId: paymentMethod?.id ?? fallback.paymentMethodId,
        paymentTypeId: paymentMethod?.type ?? fallback.paymentTypeId,
        installments: paymentMethod?.installments ?? fallback.installments,
        checkoutUrl: resource.checkout_url ?? paymentMethod?.ticket_url ?? null,
        externalCreatedAt: resource.created_date
          ? this.parseExternalDate(resource.created_date)
          : null,
        externalUpdatedAt: resource.last_updated_date
          ? this.parseExternalDate(resource.last_updated_date)
          : null,
        syncedAt: new Date(),
      };
    } catch {
      throw new BadGatewayException(
        'Mercado Pago returned an order with invalid field values.',
      );
    }
  }

  private ensureResourceMatchesTicket(
    resource: MercadoPagoOrderResource,
    ticketId: string,
  ): void {
    if (
      resource.external_reference &&
      resource.external_reference !== ticketId
    ) {
      throw new BadGatewayException(
        'Mercado Pago returned an order linked to a different ticket.',
      );
    }
  }

  private validateIdempotencyKey(rawKey?: string): string {
    const key = rawKey?.trim();
    if (!key) {
      throw new BadRequestException('Idempotency-Key is required.');
    }
    if (key.length > 150) {
      throw new BadRequestException(
        'Idempotency-Key must contain at most 150 characters.',
      );
    }
    return key;
  }

  private parseExternalDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid external date');
    }
    return parsed;
  }

  private async getOrderOrThrow(id: string) {
    const order = await this.prisma.mercadoPagoOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(
        `Mercado Pago order with id "${id}" was not found.`,
      );
    }
    return order;
  }
}
