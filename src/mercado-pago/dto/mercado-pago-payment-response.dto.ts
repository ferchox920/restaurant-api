import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoPaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '1234567890' })
  externalPaymentId!: string;

  @ApiProperty({ example: 1500.5 })
  transactionAmount!: number;

  @ApiProperty({ example: 1425.48, nullable: true })
  netReceivedAmount!: number | null;

  @ApiProperty({ example: 0, nullable: true })
  transactionAmountRefunded!: number | null;

  @ApiProperty({ example: 'ARS' })
  currencyId!: string;

  @ApiProperty({ example: 'approved' })
  status!: string;

  @ApiProperty({ example: 'accredited', nullable: true })
  statusDetail!: string | null;

  @ApiProperty({ example: 'visa', nullable: true })
  paymentMethodId!: string | null;

  @ApiProperty({ example: 'credit_card', nullable: true })
  paymentTypeId!: string | null;

  @ApiProperty({ example: 1, nullable: true })
  installments!: number | null;

  @ApiProperty({ example: 'ticket-123', nullable: true })
  externalReference!: string | null;

  @ApiProperty({ example: 'Cena', nullable: true })
  description!: string | null;

  @ApiProperty()
  liveMode!: boolean;

  @ApiProperty({ format: 'date-time' })
  dateCreated!: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  dateApproved!: Date | null;

  @ApiProperty({ format: 'date-time' })
  dateLastUpdated!: Date;

  @ApiProperty({ format: 'date-time' })
  syncedAt!: Date;
}

export class MercadoPagoPaymentsPageResponseDto {
  @ApiProperty({ type: MercadoPagoPaymentResponseDto, isArray: true })
  items!: MercadoPagoPaymentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class SyncMercadoPagoPaymentsResponseDto {
  @ApiProperty({ format: 'date-time' })
  from!: Date;

  @ApiProperty({ format: 'date-time' })
  to!: Date;

  @ApiProperty()
  fetched!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;
}
