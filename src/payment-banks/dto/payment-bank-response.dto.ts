import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentBankResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Banco Galicia' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Cuenta principal para transferencias.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  createdById!: string | null;

  @ApiProperty({ example: '2026-06-14T18:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-14T18:00:00.000Z' })
  updatedAt!: Date;
}
