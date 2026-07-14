import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SalePaymentMethod } from '../sales.enums';

export class CreateSaleTicketDto {
  @ApiProperty({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsUUID()
  salesChannelId!: string;

  @ApiPropertyOptional({ example: 'Mesa 4 - cliente frecuente.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: SalePaymentMethod,
    example: SalePaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(SalePaymentMethod)
  paymentMethod?: SalePaymentMethod;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '5b4c0bb0-5a94-4fe0-838b-6c809aaf65af',
    description: 'Obligatorio cuando paymentMethod es TRANSFER.',
  })
  @IsOptional()
  @IsUUID()
  paymentBankId?: string;
}
