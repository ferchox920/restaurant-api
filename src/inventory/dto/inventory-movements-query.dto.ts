import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  InventoryMovementType,
  type InventoryMovementType as InventoryMovementTypeValue,
} from '../inventory.enums';

export class InventoryMovementsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtra por producto.',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    enum: InventoryMovementType,
    example: InventoryMovementType.WASTE,
  })
  @IsOptional()
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementTypeValue;

  @ApiPropertyOptional({
    example: '2026-06-09T00:00:00.000Z',
    description: 'Fecha inicial inclusive.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    example: '2026-06-10T00:00:00.000Z',
    description: 'Fecha final inclusive.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
