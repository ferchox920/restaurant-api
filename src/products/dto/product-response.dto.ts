import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUnit, StockManagementType } from '../product.enums';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Hamburguesa clasica' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Medallon, pan, queso y vegetales.',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    example: 'BURG-001',
    nullable: true,
  })
  sku!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  categoryId!: string | null;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.UNIT })
  unit!: ProductUnit;

  @ApiProperty({
    enum: StockManagementType,
    example: StockManagementType.FINISHED_PRODUCT,
  })
  stockManagementType!: StockManagementType;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  createdById!: string | null;

  @ApiProperty({ example: '2026-06-09T02:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-09T02:00:00.000Z' })
  updatedAt!: Date;
}
