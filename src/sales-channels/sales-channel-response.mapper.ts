import { Prisma } from '@prisma/client';
import { SalesChannelResponseDto } from './dto/sales-channel-response.dto';

export type SalesChannelRecord =
  Prisma.SalesChannelGetPayload<Record<string, never>>;

export function toSalesChannelResponse(
  salesChannel: SalesChannelRecord,
): SalesChannelResponseDto {
  return {
    id: salesChannel.id,
    name: salesChannel.name,
    code: salesChannel.code,
    description: salesChannel.description,
    commissionType: salesChannel.commissionType,
    commissionValue: Number(salesChannel.commissionValue),
    active: salesChannel.active,
    createdById: salesChannel.createdById,
    createdAt: salesChannel.createdAt,
    updatedAt: salesChannel.updatedAt,
  };
}
