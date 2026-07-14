import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantTableStatus } from '../table.enums';
import { TableOpenOrderSummaryDto } from './table-open-order-summary.dto';

export class TableResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'M01' })
  code!: string;

  @ApiPropertyOptional({ example: 'Mesa 1', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'Salon principal', nullable: true })
  area!: string | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  capacity!: number | null;
  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ enum: RestaurantTableStatus })
  status!: RestaurantTableStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdById!: string | null;

  @ApiProperty({ example: '2026-06-29T22:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-29T22:30:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    type: TableOpenOrderSummaryDto,
    nullable: true,
  })
  openOrder!: TableOpenOrderSummaryDto | null;
}
