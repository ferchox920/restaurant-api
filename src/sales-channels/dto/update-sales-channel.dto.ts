import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CommissionType } from '../sales-channel.enums';
import { SalesChannelSubTaxInputDto } from './sales-channel-sub-tax.dto';

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

  @ApiPropertyOptional({
    type: SalesChannelSubTaxInputDto,
    isArray: true,
    example: [{ name: 'IVA', percentage: 21 }],
    description:
      'Si se envia, reemplaza la lista completa de subtaxes del canal.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesChannelSubTaxInputDto)
  subTaxes?: SalesChannelSubTaxInputDto[];
}
