import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalesByProductReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Hamburguesa clasica' })
  productNameSnapshot!: string;

  @ApiPropertyOptional({ example: 'BURGER-001', nullable: true })
  productSkuSnapshot!: string | null;

  @ApiProperty({ example: 'UNIT' })
  productUnitSnapshot!: string;

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

  @ApiProperty({ example: 3 })
  ticketsCount!: number;
}
