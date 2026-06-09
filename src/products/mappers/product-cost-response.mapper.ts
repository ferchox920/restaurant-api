import { Prisma } from '@prisma/client';
import { ProductCostResponseDto } from '../dto/product-cost-response.dto';

export type ProductCostHistoryRecord = Prisma.ProductCostHistoryGetPayload<
  Record<string, never>
>;

export function toProductCostResponse(
  costHistory: ProductCostHistoryRecord,
): ProductCostResponseDto {
  return {
    id: costHistory.id,
    productId: costHistory.productId,
    cost: costHistory.cost.toString(),
    validFrom: costHistory.validFrom,
    validTo: costHistory.validTo,
    createdById: costHistory.createdById,
    createdAt: costHistory.createdAt,
    isCurrent: costHistory.validTo === null,
  };
}
