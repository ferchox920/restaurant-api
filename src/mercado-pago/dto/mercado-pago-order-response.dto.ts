import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoOrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  saleTicketId!: string;

  @ApiProperty({ example: 'ORD01J49MMW3SSBK5PSV3DFR32959' })
  externalOrderId!: string;

  @ApiProperty({ example: 'processed' })
  status!: string;

  @ApiProperty({ example: 'accredited', nullable: true })
  statusDetail!: string | null;

  @ApiProperty({ example: 7500 })
  totalAmount!: number;

  @ApiProperty({ example: 7500, nullable: true })
  totalPaidAmount!: number | null;

  @ApiProperty({ example: 'ARS' })
  currencyId!: string;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  paymentStatus!: string | null;

  @ApiProperty({ nullable: true })
  paymentStatusDetail!: string | null;

  @ApiProperty({ nullable: true })
  paymentMethodId!: string | null;

  @ApiProperty({ nullable: true })
  paymentTypeId!: string | null;

  @ApiProperty({ nullable: true })
  installments!: number | null;

  @ApiProperty({ nullable: true })
  checkoutUrl!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  externalCreatedAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  externalUpdatedAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  syncedAt!: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  reconciledAt!: Date | null;

  @ApiProperty({ nullable: true })
  reconciliationError!: string | null;
}
