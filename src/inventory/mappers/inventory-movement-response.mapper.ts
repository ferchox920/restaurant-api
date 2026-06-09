import { Decimal } from '@prisma/client/runtime/library';
import { InventoryMovementResponseDto } from '../dto/inventory-movement-response.dto';
import {
  InventoryMovementType,
  InventoryReferenceType,
} from '../inventory.enums';

export type InventoryMovementRecord = {
  id: string;
  productId: string;
  movementType: InventoryMovementType;
  quantity: Decimal;
  previousStock: Decimal;
  newStock: Decimal;
  reason: string;
  referenceType: InventoryReferenceType;
  referenceId: string | null;
  createdById: string | null;
  createdAt: Date;
  product?: {
    name: string;
  } | null;
};

export function toInventoryMovementResponse(
  movement: InventoryMovementRecord,
): InventoryMovementResponseDto {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.product?.name ?? '',
    movementType: movement.movementType,
    quantity: movement.quantity.toString(),
    previousStock: movement.previousStock.toString(),
    newStock: movement.newStock.toString(),
    reason: movement.reason,
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    createdById: movement.createdById,
    createdAt: movement.createdAt,
  };
}
