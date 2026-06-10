import { Prisma } from '@prisma/client';
import { SaleTicketItemResponseDto } from '../dto/sale-ticket-item-response.dto';

export type SaleTicketItemRecord = Prisma.SaleTicketItemGetPayload<object>;

export function toSaleTicketItemResponse(
  item: SaleTicketItemRecord,
): SaleTicketItemResponseDto {
  return {
    id: item.id,
    ticketId: item.ticketId,
    productId: item.productId,
    productNameSnapshot: item.productNameSnapshot,
    productSkuSnapshot: item.productSkuSnapshot,
    productUnitSnapshot: item.productUnitSnapshot,
    quantity: item.quantity.toString(),
    unitPriceSnapshot: item.unitPriceSnapshot.toString(),
    unitCostSnapshot: item.unitCostSnapshot.toString(),
    subtotal: item.subtotal.toString(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
