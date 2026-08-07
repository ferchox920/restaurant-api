import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  MercadoPagoPaymentsPageResponseDto,
  SyncMercadoPagoPaymentsResponseDto,
} from './dto/mercado-pago-payment-response.dto';
import { MercadoPagoPaymentsQueryDto } from './dto/mercado-pago-payments-query.dto';
import { SyncMercadoPagoPaymentsQueryDto } from './dto/sync-mercado-pago-payments-query.dto';
import { MercadoPagoClient } from './mercado-pago.client';
import { toMercadoPagoPaymentResponse } from './mercado-pago-payment.mapper';
import { MercadoPagoPaymentResource } from './mercado-pago.types';

const DEFAULT_SYNC_DAYS = 30;
const MAX_SYNC_RANGE_MS = 365 * 24 * 60 * 60 * 1000;
const SYNC_PAGE_SIZE = 100;

@Injectable()
export class MercadoPagoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MercadoPagoClient,
  ) {}

  async syncPayments(
    query: SyncMercadoPagoPaymentsQueryDto,
  ): Promise<SyncMercadoPagoPaymentsResponseDto> {
    const { from, to } = this.resolveSyncRange(query);
    let offset = 0;
    let fetched = 0;
    let created = 0;
    let updated = 0;

    while (true) {
      const page = await this.client.searchPayments({
        from,
        to,
        limit: SYNC_PAGE_SIZE,
        offset,
      });
      const normalized = page.results.map((payment) =>
        this.toPersistenceData(payment),
      );
      const externalIds = normalized.map(
        (payment) => payment.externalPaymentId,
      );
      const existing = externalIds.length
        ? await this.prisma.mercadoPagoPayment.findMany({
            where: { externalPaymentId: { in: externalIds } },
            select: { externalPaymentId: true },
          })
        : [];
      const existingIds = new Set(
        existing.map((payment) => payment.externalPaymentId),
      );
      const syncedAt = new Date();

      await this.prisma.$transaction(async (tx) => {
        for (const payment of normalized) {
          await tx.mercadoPagoPayment.upsert({
            where: { externalPaymentId: payment.externalPaymentId },
            create: { ...payment, syncedAt },
            update: { ...payment, syncedAt },
          });
        }
      });

      fetched += normalized.length;
      created += normalized.filter(
        (payment) => !existingIds.has(payment.externalPaymentId),
      ).length;
      updated += normalized.filter((payment) =>
        existingIds.has(payment.externalPaymentId),
      ).length;

      if (
        page.results.length === 0 ||
        offset + page.results.length >= page.paging.total
      ) {
        break;
      }
      offset += page.results.length;
    }

    return { from, to, fetched, created, updated };
  }

  async findAll(
    query: MercadoPagoPaymentsQueryDto,
  ): Promise<MercadoPagoPaymentsPageResponseDto> {
    const { from, to } = this.resolveOptionalRange(query.from, query.to);
    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;
    const where = {
      status: query.status,
      dateCreated:
        from || to
          ? {
              gte: from,
              lte: to,
            }
          : undefined,
    } satisfies Prisma.MercadoPagoPaymentWhereInput;
    const [payments, total] = await Promise.all([
      this.prisma.mercadoPagoPayment.findMany({
        where,
        orderBy: [{ dateCreated: 'desc' }, { externalPaymentId: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.mercadoPagoPayment.count({ where }),
    ]);

    return {
      items: payments.map(toMercadoPagoPaymentResponse),
      total,
      limit,
      offset,
    };
  }

  private resolveSyncRange(query: SyncMercadoPagoPaymentsQueryDto): {
    from: Date;
    to: Date;
  } {
    const now = new Date();
    const to = query.to ? new Date(query.to) : now;
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_SYNC_DAYS * 24 * 60 * 60 * 1000);

    this.ensureOrderedRange(from, to);
    if (to.getTime() > now.getTime()) {
      throw new BadRequestException('to cannot be in the future.');
    }
    if (to.getTime() - from.getTime() >= MAX_SYNC_RANGE_MS) {
      throw new BadRequestException(
        'The sync range must be less than 365 days.',
      );
    }

    return { from, to };
  }

  private resolveOptionalRange(
    rawFrom?: string,
    rawTo?: string,
  ): { from?: Date; to?: Date } {
    const from = rawFrom ? new Date(rawFrom) : undefined;
    const to = rawTo ? new Date(rawTo) : undefined;
    if (from && to) {
      this.ensureOrderedRange(from, to);
    }
    return { from, to };
  }

  private ensureOrderedRange(from: Date, to: Date): void {
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be before or equal to to.');
    }
  }

  private toPersistenceData(
    payment: MercadoPagoPaymentResource,
  ): Prisma.MercadoPagoPaymentUncheckedCreateInput {
    try {
      const dateCreated = this.parseExternalDate(payment.date_created);
      const dateLastUpdated = this.parseExternalDate(payment.date_last_updated);
      const dateApproved = payment.date_approved
        ? this.parseExternalDate(payment.date_approved)
        : null;

      return {
        externalPaymentId: String(payment.id),
        transactionAmount: new Prisma.Decimal(payment.transaction_amount),
        netReceivedAmount:
          payment.transaction_details?.net_received_amount == null
            ? null
            : new Prisma.Decimal(
                payment.transaction_details.net_received_amount,
              ),
        transactionAmountRefunded:
          payment.transaction_amount_refunded == null
            ? null
            : new Prisma.Decimal(payment.transaction_amount_refunded),
        currencyId: payment.currency_id,
        status: payment.status,
        statusDetail: payment.status_detail ?? null,
        paymentMethodId: payment.payment_method_id ?? null,
        paymentTypeId: payment.payment_type_id ?? null,
        installments: payment.installments ?? null,
        externalReference: payment.external_reference ?? null,
        description: payment.description ?? null,
        liveMode: payment.live_mode,
        dateCreated,
        dateApproved,
        dateLastUpdated,
      };
    } catch {
      throw new BadGatewayException(
        'Mercado Pago returned a payment with invalid field values.',
      );
    }
  }

  private parseExternalDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid date');
    }
    return parsed;
  }
}
