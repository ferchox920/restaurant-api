import { RestaurantTableStatus } from './table.enums';
import { TableResponseDto } from './dto/table-response.dto';

type TableRecord = {
  id: string;
  code: string;
  name: string | null;
  area: string | null;
  capacity: number | null;
  active: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  orders?: Array<{
    id: string;
    saleTicketId: string;
    openedAt: Date;
    notes: string | null;
  }>;
};

export function toTableResponse(table: TableRecord): TableResponseDto {
  const openOrder = table.orders?.[0] ?? null;

  return {
    id: table.id,
    code: table.code,
    name: table.name,
    area: table.area,
    capacity: table.capacity,
    active: table.active,
    status: resolveTableStatus(table.active, Boolean(openOrder)),
    createdById: table.createdById,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    openOrder: openOrder
      ? {
          id: openOrder.id,
          saleTicketId: openOrder.saleTicketId,
          openedAt: openOrder.openedAt,
          notes: openOrder.notes,
        }
      : null,
  };
}

function resolveTableStatus(
  active: boolean,
  hasOpenOrder: boolean,
): RestaurantTableStatus {
  if (!active) {
    return RestaurantTableStatus.INACTIVE;
  }

  return hasOpenOrder
    ? RestaurantTableStatus.OCCUPIED
    : RestaurantTableStatus.AVAILABLE;
}
