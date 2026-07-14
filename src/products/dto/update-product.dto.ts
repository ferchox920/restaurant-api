import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ProductUnit, StockManagementType } from '../product.enums';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Hamburguesa clasica' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Medallon, pan, queso y vegetales.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'BURG-001' })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: ProductUnit, example: ProductUnit.SERVICE })
  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ApiPropertyOptional({
    enum: StockManagementType,
    example: StockManagementType.NON_STOCKED,
  })
  @IsOptional()
  @IsEnum(StockManagementType)
  stockManagementType?: StockManagementType;
}
