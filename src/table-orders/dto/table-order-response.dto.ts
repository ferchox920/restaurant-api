import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleTicketResponseDto } from '../../sales/dto/sale-ticket-response.dto';
import { TableOrderStatus } from '../table-orders.enums';

export class TableOrderResponseDto {
  @ApiProperty({ example: '1' })
  version!: string;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantTableId!: string;

  @ApiProperty({ example: 'M01' })
  tableCode!: string;

  @ApiPropertyOptional({ example: 'Mesa 1', nullable: true })
  tableName!: string | null;

  @ApiPropertyOptional({ example: 'Salon', nullable: true })
  tableArea!: string | null;

  @ApiProperty({ format: 'uuid' })
  saleTicketId!: string;

  @ApiProperty({ enum: TableOrderStatus })
  status!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  openedById!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  cancelledById!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  closedById!: string | null;

  @ApiPropertyOptional({ example: 'Cliente frecuente.', nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ example: 'Cliente se retiro.', nullable: true })
  cancelReason!: string | null;

  @ApiProperty({ example: '2026-06-30T18:00:00.000Z' })
  openedAt!: Date;

  @ApiPropertyOptional({ example: '2026-06-30T18:20:00.000Z', nullable: true })
  cancelledAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-06-30T19:00:00.000Z', nullable: true })
  closedAt!: Date | null;

  @ApiProperty({ example: '2026-06-30T18:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-30T18:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: SaleTicketResponseDto })
  saleTicket!: SaleTicketResponseDto;
}
