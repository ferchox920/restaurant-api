import { MercadoPagoOrder } from '@prisma/client';
import { MercadoPagoOrderResponseDto } from './dto/mercado-pago-order-response.dto';

export function toMercadoPagoOrderResponse(
  order: MercadoPagoOrder,
): MercadoPagoOrderResponseDto {
  return {
    id: order.id,
    saleTicketId: order.saleTicketId,
    externalOrderId: order.externalOrderId,
    status: order.status,
    statusDetail: order.statusDetail,
    totalAmount: order.totalAmount.toNumber(),
    totalPaidAmount: order.totalPaidAmount?.toNumber() ?? null,
    currencyId: order.currencyId,
    paymentId: order.paymentId,
    paymentStatus: order.paymentStatus,
    paymentStatusDetail: order.paymentStatusDetail,
    paymentMethodId: order.paymentMethodId,
    paymentTypeId: order.paymentTypeId,
    installments: order.installments,
    checkoutUrl: order.checkoutUrl,
    externalCreatedAt: order.externalCreatedAt,
    externalUpdatedAt: order.externalUpdatedAt,
    syncedAt: order.syncedAt,
    reconciledAt: order.reconciledAt,
    reconciliationError: order.reconciliationError,
  };
}
