import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductCostResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({
    example: '3500.50',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  cost!: string;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  validFrom!: Date;

  @ApiPropertyOptional({
    example: '2026-06-10T03:00:00.000Z',
    nullable: true,
  })
  validTo!: Date | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  createdById!: string | null;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: true })
  isCurrent!: boolean;
}
