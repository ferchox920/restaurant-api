import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateProductPriceDto {
  @ApiProperty({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsUUID()
  salesChannelId!: string;

  @ApiProperty({
    example: 5999.99,
    minimum: 0,
    description:
      'Precio del producto para el canal. El servidor asigna validFrom y no admite validTo ni createdById en el payload.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;
}
