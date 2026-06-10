import { ApiProperty } from '@nestjs/swagger';

export class SalesByChannelReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  salesChannelId!: string;

  @ApiProperty({ example: 'PedidosYa' })
  salesChannelName!: string;

  @ApiProperty({ example: 'PEDIDOSYA' })
  salesChannelCode!: string;

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

  @ApiProperty({
    example: '4000.00',
    description:
      'Ticket promedio serializado como string decimal para evitar perdida de precision.',
  })
  averageTicket!: string;
}
