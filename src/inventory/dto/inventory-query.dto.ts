import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  InventoryStockStatus,
  type InventoryStockStatus as InventoryStockStatusValue,
} from '../inventory.enums';

export class InventoryQueryDto extends PaginationQueryDto {
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
    enum: InventoryStockStatus,
    example: InventoryStockStatus.LOW_STOCK,
  })
  @IsOptional()
  @IsEnum(InventoryStockStatus)
  stockStatus?: InventoryStockStatusValue;

  @ApiPropertyOptional({
    example: 'burger',
    description: 'Busca por texto en productName o productSku.',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  search?: string;
}
