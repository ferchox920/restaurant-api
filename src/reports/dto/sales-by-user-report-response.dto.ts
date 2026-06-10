import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalesByUserReportResponseDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
    nullable: true,
  })
  userId!: string | null;

  @ApiPropertyOptional({
    example: 'manager@example.com',
    nullable: true,
  })
  userEmail!: string | null;

  @ApiPropertyOptional({
    example: 'Ada Lovelace',
    nullable: true,
  })
  userFullName!: string | null;

  @ApiProperty({ example: 3 })
  ticketsCount!: number;

  @ApiProperty({ example: 8 })
  itemsCount!: number;

  @ApiProperty({
    example: '12.00',
    description:
      'Cantidad vendida serializada como string decimal para evitar perdida de precision.',
  })
  quantitySold!: string;

  @ApiProperty({
    example: '12000.00',
    description:
      'Venta bruta serializada como string decimal para evitar perdida de precision.',
  })
  grossSales!: string;

  @ApiProperty({
    example: '5000.00',
    description:
      'Costo historico serializado como string decimal para evitar perdida de precision.',
  })
  historicalCost!: string;

  @ApiProperty({
    example: '7000.00',
    description:
      'Margen bruto serializado como string decimal para evitar perdida de precision.',
  })
  grossProfit!: string;
}
