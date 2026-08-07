import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoOrderPreviewItemDto {
  @ApiProperty({ example: 'Hamburguesa completa' })
  title!: string;

  @ApiProperty({ example: 'Hamburguesa completa' })
  description!: string;

  @ApiProperty({
    example: '7500.00',
    description: 'Precio decimal serializado como string.',
  })
  unit_price!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 'HAMB-001' })
  external_code!: string;
}

export class MercadoPagoOrderPreviewPayloadDto {
  @ApiProperty({ example: 'online' })
  type!: 'online';

  @ApiProperty({ example: 'automatic' })
  processing_mode!: 'automatic';

  @ApiProperty({ format: 'uuid' })
  external_reference!: string;

  @ApiProperty({ example: 'Ticket #1001' })
  description!: string;

  @ApiProperty({
    example: '15000.00',
    description: 'Total decimal serializado como string.',
  })
  total_amount!: string;

  @ApiProperty({ type: MercadoPagoOrderPreviewItemDto, isArray: true })
  items!: MercadoPagoOrderPreviewItemDto[];
}

export class MercadoPagoOrderPreviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  ticketId!: string;

  @ApiProperty({ example: 1001 })
  ticketNumber!: number;

  @ApiProperty({ type: MercadoPagoOrderPreviewPayloadDto })
  payload!: MercadoPagoOrderPreviewPayloadDto;
}
