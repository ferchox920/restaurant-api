import { ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SalePaymentMethod } from '../sales.enums';

export class ConfirmSaleTicketDto {
  @ApiPropertyOptional({
    enum: SalePaymentMethod,
    example: SalePaymentMethod.CASH,
    description:
      'Si se envia, reemplaza el medio de pago cargado en el ticket antes de confirmar.',
  })
  @IsOptional()
  @IsEnum(SalePaymentMethod)
  paymentMethod?: SalePaymentMethod;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '5b4c0bb0-5a94-4fe0-838b-6c809aaf65af',
    description: 'Obligatorio cuando el medio de pago final es TRANSFER.',
  })
  @IsOptional()
  @IsUUID()
  paymentBankId?: string;

  @Allow()
  _empty?: boolean;
}
