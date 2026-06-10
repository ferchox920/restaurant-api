import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUnit } from '../../products/product.enums';

export class SaleTicketItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ticketId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Hamburguesa clasica' })
  productNameSnapshot!: string;

  @ApiPropertyOptional({
    example: 'BURGER-001',
    nullable: true,
  })
  productSkuSnapshot!: string | null;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.UNIT })
  productUnitSnapshot!: ProductUnit;

  @ApiProperty({
    example: '2',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  quantity!: string;

  @ApiProperty({
    example: '5999.99',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  unitPriceSnapshot!: string;

  @ApiProperty({
    example: '2500.00',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  unitCostSnapshot!: string;

  @ApiProperty({
    example: '11999.98',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  subtotal!: string;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-09T03:05:00.000Z' })
  updatedAt!: Date;
}
