import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionType } from '../sales-channel.enums';
import { SalesChannelSubTaxResponseDto } from './sales-channel-sub-tax.dto';

export class SalesChannelResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PedidosYa' })
  name!: string;

  @ApiProperty({ example: 'PEDIDOS_YA' })
  code!: string;

  @ApiPropertyOptional({
    example: 'Canal de marketplace con comision porcentual.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE })
  commissionType!: CommissionType;

  @ApiProperty({ example: 18 })
  commissionValue!: number;

  @ApiProperty({ type: SalesChannelSubTaxResponseDto, isArray: true })
  subTaxes!: SalesChannelSubTaxResponseDto[];

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  createdById!: string | null;

  @ApiProperty({ example: '2026-06-09T01:45:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-09T01:45:00.000Z' })
  updatedAt!: Date;
}
