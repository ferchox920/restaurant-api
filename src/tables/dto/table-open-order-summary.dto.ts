import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TableOpenOrderSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  saleTicketId!: string;

  @ApiProperty({ example: '2026-06-30T18:00:00.000Z' })
  openedAt!: Date;

  @ApiPropertyOptional({ example: 'Cliente frecuente.', nullable: true })
  notes!: string | null;
}
