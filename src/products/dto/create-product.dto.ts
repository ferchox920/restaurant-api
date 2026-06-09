import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductUnit, StockManagementType } from '../product.enums';

export class CreateProductDto {
  @ApiProperty({ example: 'Hamburguesa clasica' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Medallon, pan, queso y vegetales.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'BURG-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.UNIT })
  @IsEnum(ProductUnit)
  unit!: ProductUnit;

  @ApiPropertyOptional({
    enum: StockManagementType,
    example: StockManagementType.FINISHED_PRODUCT,
    default: StockManagementType.FINISHED_PRODUCT,
  })
  @IsOptional()
  @IsEnum(StockManagementType)
  stockManagementType?: StockManagementType;
}
