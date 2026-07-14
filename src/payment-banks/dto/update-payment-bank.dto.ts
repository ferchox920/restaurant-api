import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentBankDto {
  @ApiPropertyOptional({ example: 'Banco Galicia' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Cuenta principal para transferencias.' })
  @IsOptional()
  @IsString()
  description?: string;
}
