import { Decimal } from '@prisma/client/runtime/library';
import { SaleTicketResponseDto } from '../dto/sale-ticket-response.dto';
import { SalePaymentMethod, SaleTicketStatus } from '../sales.enums';
import { toSaleTicketItemResponse } from './sale-ticket-item-response.mapper';

export type SaleTicketRecord = {
  id: string;
  ticketNumber: number;
  salesChannelId: string;
  status: SaleTicketStatus;
  paymentMethod: SalePaymentMethod | null;
  paymentBankId: string | null;
  paymentBankNameSnapshot: string | null;
  subtotal: Decimal;
  discountTotal: Decimal;
  commissionTotal: Decimal;
  total: Decimal;
  notes: string | null;
  createdById: string | null;
  confirmedById: string | null;
  cancelledById: string | null;
  voidedById: string | null;
  cancellationReason: string | null;
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  voidedAt: Date | null;
  salesChannel: {
    name: string;
  } | null;
  paymentBank: {
    name: string;
  } | null;
  items: Array<Parameters<typeof toSaleTicketItemResponse>[0]>;
};

export function toSaleTicketResponse(
  ticket: SaleTicketRecord,
): SaleTicketResponseDto {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    salesChannelId: ticket.salesChannelId,
    salesChannelName: ticket.salesChannel?.name ?? null,
    status: ticket.status,
    paymentMethod: ticket.paymentMethod,
    paymentBankId: ticket.paymentBankId,
    paymentBankName: ticket.paymentBank?.name ?? null,
    paymentBankNameSnapshot: ticket.paymentBankNameSnapshot,
    subtotal: ticket.subtotal.toString(),
    discountTotal: ticket.discountTotal.toString(),
    commissionTotal: ticket.commissionTotal.toString(),
    total: ticket.total.toString(),
    notes: ticket.notes,
    createdById: ticket.createdById,
    confirmedById: ticket.confirmedById,
    cancelledById: ticket.cancelledById,
    voidedById: ticket.voidedById,
    cancellationReason: ticket.cancellationReason,
    voidReason: ticket.voidReason,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    confirmedAt: ticket.confirmedAt,
    cancelledAt: ticket.cancelledAt,
    voidedAt: ticket.voidedAt,
    items: ticket.items.map(toSaleTicketItemResponse),
  };
}
