import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  StockManagementType,
  type StockManagementType as StockManagementTypeValue,
} from '../../products/product.enums';
import {
  ReportStockStatus,
  type ReportStockStatus as ReportStockStatusValue,
} from '../reports.enums';

export class StockReportQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Filtra por estado activo del producto. Si no se envia, devuelve activos e inactivos.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: ReportStockStatus,
    example: ReportStockStatus.LOW_STOCK,
  })
  @IsOptional()
  @IsEnum(ReportStockStatus)
  stockStatus?: ReportStockStatusValue;

  @ApiPropertyOptional({
    enum: StockManagementType,
    example: StockManagementType.FINISHED_PRODUCT,
  })
  @IsOptional()
  @IsEnum(StockManagementType)
  stockManagementType?: StockManagementTypeValue;

  @ApiPropertyOptional({
    example: 'burger',
    description: 'Busca por texto en productName o productSku.',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  search?: string;
}
