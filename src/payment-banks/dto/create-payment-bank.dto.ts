import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentBankDto {
  @ApiProperty({ example: 'Banco Galicia' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Cuenta principal para transferencias.' })
  @IsOptional()
  @IsString()
  description?: string;
}
