import { Decimal } from '@prisma/client/runtime/library';
import { InventoryMovementsReportItemResponseDto } from '../dto/inventory-movements-report-item-response.dto';

export type InventoryMovementReportRecord = {
  id: string;
  productId: string;
  movementType: string;
  quantity: Decimal;
  previousStock: Decimal;
  newStock: Decimal;
  reason: string;
  referenceType: string;
  referenceId: string | null;
  createdById: string | null;
  createdAt: Date;
  product: {
    name: string;
    sku: string | null;
  };
  createdBy?: {
    email: string;
    name: string;
  } | null;
};

export function toInventoryMovementReportResponse(
  movement: InventoryMovementReportRecord,
): InventoryMovementsReportItemResponseDto {
  return {
    movementId: movement.id,
    productId: movement.productId,
    productName: movement.product.name,
    productSku: movement.product.sku,
    movementType: movement.movementType,
    quantity: movement.quantity.toString(),
    previousStock: movement.previousStock.toString(),
    newStock: movement.newStock.toString(),
    reason: movement.reason,
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    createdById: movement.createdById,
    createdByEmail: movement.createdBy?.email ?? null,
    createdByName: movement.createdBy?.name ?? null,
    createdAt: movement.createdAt,
  };
}
