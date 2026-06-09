import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CommissionType } from '../sales-channel.enums';

export class UpdateSalesChannelDto {
  @ApiPropertyOptional({ example: 'Mostrador' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'COUNTER' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({ example: 'Ventas directas en caja o salón.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: CommissionType,
    example: CommissionType.PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({
    example: 18,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionValue?: number;
}
