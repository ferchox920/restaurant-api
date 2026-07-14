import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class SalesChannelSubTaxInputDto {
  @ApiProperty({ example: 'IVA' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 21, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

export class SalesChannelSubTaxResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'IVA' })
  name!: string;

  @ApiProperty({ example: 21 })
  percentage!: number;
}
