import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SalePaymentMethod } from '../sales.enums';
import { ExpectedVersionDto } from '../../common/dto/expected-version.dto';

export class UpdateSaleTicketDto extends ExpectedVersionDto {
  @ApiPropertyOptional({ example: 'Cliente solicita sin cebolla.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: SalePaymentMethod,
    example: SalePaymentMethod.TRANSFER,
  })
  @IsOptional()
  @IsEnum(SalePaymentMethod)
  paymentMethod?: SalePaymentMethod;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '5b4c0bb0-5a94-4fe0-838b-6c809aaf65af',
  })
  @IsOptional()
  @IsUUID()
  paymentBankId?: string;
}
