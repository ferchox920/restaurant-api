import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleTicketItemResponseDto } from './sale-ticket-item-response.dto';
import { SalePaymentMethod, SaleTicketStatus } from '../sales.enums';

export class SaleTicketResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1001 })
  ticketNumber!: number;

  @ApiProperty({ format: 'uuid' })
  salesChannelId!: string;

  @ApiPropertyOptional({
    example: 'PedidosYa',
    nullable: true,
  })
  salesChannelName!: string | null;

  @ApiProperty({ enum: SaleTicketStatus, example: SaleTicketStatus.DRAFT })
  status!: string;

  @ApiPropertyOptional({
    enum: SalePaymentMethod,
    example: SalePaymentMethod.CASH,
    nullable: true,
  })
  paymentMethod!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '5b4c0bb0-5a94-4fe0-838b-6c809aaf65af',
    nullable: true,
  })
  paymentBankId!: string | null;

  @ApiPropertyOptional({
    example: 'Banco Galicia',
    nullable: true,
  })
  paymentBankName!: string | null;

  @ApiPropertyOptional({
    example: 'Banco Galicia',
    nullable: true,
  })
  paymentBankNameSnapshot!: string | null;

  @ApiProperty({
    example: '11999.98',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  subtotal!: string;

  @ApiProperty({
    example: '0',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  discountTotal!: string;

  @ApiProperty({
    example: '0',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  commissionTotal!: string;

  @ApiProperty({
    example: '11999.98',
    description:
      'Valor decimal serializado como string para evitar perdida de precision.',
  })
  total!: string;

  @ApiPropertyOptional({
    example: 'Mesa 4 - cliente frecuente.',
    nullable: true,
  })
  notes!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
    nullable: true,
  })
  createdById!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
    nullable: true,
  })
  confirmedById!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
    nullable: true,
  })
  cancelledById!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
    nullable: true,
  })
  voidedById!: string | null;

  @ApiPropertyOptional({
    example: 'Cliente desistio de la compra.',
    nullable: true,
  })
  cancellationReason!: string | null;

  @ApiPropertyOptional({
    example: 'Venta anulada por error de carga.',
    nullable: true,
  })
  voidReason!: string | null;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-09T03:05:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    example: '2026-06-09T03:07:00.000Z',
    nullable: true,
  })
  confirmedAt!: Date | null;

  @ApiPropertyOptional({
    example: '2026-06-09T03:10:00.000Z',
    nullable: true,
  })
  cancelledAt!: Date | null;

  @ApiPropertyOptional({
    example: '2026-06-09T03:20:00.000Z',
    nullable: true,
  })
  voidedAt!: Date | null;

  @ApiProperty({
    type: SaleTicketItemResponseDto,
    isArray: true,
  })
  items!: SaleTicketItemResponseDto[];
}
