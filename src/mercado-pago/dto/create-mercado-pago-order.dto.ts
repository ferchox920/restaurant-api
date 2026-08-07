import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateMercadoPagoOrderDto {
  @ApiProperty({
    description:
      'Token de tarjeta de un solo uso generado por MercadoPago.js o Card Payment Brick.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  cardToken!: string;

  @ApiProperty({ example: 'master' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  paymentMethodId!: string;

  @ApiProperty({ enum: ['credit_card', 'debit_card'] })
  @IsIn(['credit_card', 'debit_card'])
  paymentTypeId!: 'credit_card' | 'debit_card';

  @ApiProperty({ example: 1, minimum: 1, maximum: 36 })
  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;

  @ApiProperty({ example: 'comprador@testuser.com' })
  @IsEmail()
  @MaxLength(254)
  payerEmail!: string;

  @ApiPropertyOptional({ example: 'Maria' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payerFirstName?: string;

  @ApiPropertyOptional({ example: 'Gonzalez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payerLastName?: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @ValidateIf((dto: CreateMercadoPagoOrderDto) =>
    Boolean(dto.identificationNumber || dto.identificationType),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  identificationType?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @ValidateIf((dto: CreateMercadoPagoOrderDto) =>
    Boolean(dto.identificationType || dto.identificationNumber),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  identificationNumber?: string;
}
