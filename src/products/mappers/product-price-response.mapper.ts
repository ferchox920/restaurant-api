import { Prisma } from '@prisma/client';
import { ProductPriceResponseDto } from '../dto/product-price-response.dto';

export type ProductPriceHistoryRecord = Prisma.ProductPriceHistoryGetPayload<{
  include: {
    salesChannel: {
      select: {
        name: true;
      };
    };
  };
}>;

export function toProductPriceResponse(
  priceHistory: ProductPriceHistoryRecord,
): ProductPriceResponseDto {
  return {
    id: priceHistory.id,
    productId: priceHistory.productId,
    salesChannelId: priceHistory.salesChannelId,
    salesChannelName: priceHistory.salesChannel?.name ?? null,
    price: priceHistory.price.toString(),
    validFrom: priceHistory.validFrom,
    validTo: priceHistory.validTo,
    createdById: priceHistory.createdById,
    createdAt: priceHistory.createdAt,
    isCurrent: priceHistory.validTo === null,
  };
}
