import { toSaleTicketResponse } from '../sales/mappers/sale-ticket-response.mapper';
import { TableOrderResponseDto } from './dto/table-order-response.dto';
import { TableOrderStatus } from './table-orders.enums';

type TableOrderRecord = {
  id: string;
  restaurantTableId: string;
  saleTicketId: string;
  status: TableOrderStatus;
  openedById: string | null;
  cancelledById: string | null;
  closedById: string | null;
  notes: string | null;
  cancelReason: string | null;
  openedAt: Date;
  cancelledAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  restaurantTable: {
    code: string;
    name: string | null;
    area: string | null;
  };
  saleTicket: Parameters<typeof toSaleTicketResponse>[0];
};

export function toTableOrderResponse(
  order: TableOrderRecord,
): TableOrderResponseDto {
  return {
    id: order.id,
    restaurantTableId: order.restaurantTableId,
    tableCode: order.restaurantTable.code,
    tableName: order.restaurantTable.name,
    tableArea: order.restaurantTable.area,
    saleTicketId: order.saleTicketId,
    status: order.status,
    openedById: order.openedById,
    cancelledById: order.cancelledById,
    closedById: order.closedById,
    notes: order.notes,
    cancelReason: order.cancelReason,
    openedAt: order.openedAt,
    cancelledAt: order.cancelledAt,
    closedAt: order.closedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    saleTicket: toSaleTicketResponse(order.saleTicket),
  };
}
