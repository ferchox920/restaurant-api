import { SalesChannelResponseDto } from './dto/sales-channel-response.dto';
import { CommissionType } from './sales-channel.enums';

export type SalesChannelRecord = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  commissionType: CommissionType;
  commissionValue: {
    toString(): string;
  } | number;
  active: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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
