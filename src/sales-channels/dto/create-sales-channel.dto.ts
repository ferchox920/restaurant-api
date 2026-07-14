import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateSalesChannelDto {
  @ApiProperty({ example: 'Mostrador' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'COUNTER' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'Ventas directas en caja o salón.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: CommissionType,
    example: CommissionType.NONE,
    default: CommissionType.NONE,
  })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
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
    default: [],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesChannelSubTaxInputDto)
  subTaxes?: SalesChannelSubTaxInputDto[];
}
