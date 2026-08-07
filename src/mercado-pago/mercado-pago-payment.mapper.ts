import { MercadoPagoPayment } from '@prisma/client';
import { MercadoPagoPaymentResponseDto } from './dto/mercado-pago-payment-response.dto';

export function toMercadoPagoPaymentResponse(
  payment: MercadoPagoPayment,
): MercadoPagoPaymentResponseDto {
  return {
    id: payment.id,
    externalPaymentId: payment.externalPaymentId,
    transactionAmount: payment.transactionAmount.toNumber(),
    netReceivedAmount: payment.netReceivedAmount?.toNumber() ?? null,
    transactionAmountRefunded:
      payment.transactionAmountRefunded?.toNumber() ?? null,
    currencyId: payment.currencyId,
    status: payment.status,
    statusDetail: payment.statusDetail,
    paymentMethodId: payment.paymentMethodId,
    paymentTypeId: payment.paymentTypeId,
    installments: payment.installments,
    externalReference: payment.externalReference,
    description: payment.description,
    liveMode: payment.liveMode,
    dateCreated: payment.dateCreated,
    dateApproved: payment.dateApproved,
    dateLastUpdated: payment.dateLastUpdated,
    syncedAt: payment.syncedAt,
  };
}
