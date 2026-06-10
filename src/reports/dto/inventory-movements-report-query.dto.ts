import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  InventoryMovementType,
  type InventoryMovementType as InventoryMovementTypeValue,
  InventoryReferenceType,
  type InventoryReferenceType as InventoryReferenceTypeValue,
} from '../../inventory/inventory.enums';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

export class InventoryMovementsReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    enum: InventoryMovementType,
    example: InventoryMovementType.SALE_OUT,
  })
  @IsOptional()
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementTypeValue;

  @ApiPropertyOptional({
    enum: InventoryReferenceType,
    example: InventoryReferenceType.SALE_TICKET,
  })
  @IsOptional()
  @IsEnum(InventoryReferenceType)
  referenceType?: InventoryReferenceTypeValue;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
