import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateProductCostDto {
  @ApiProperty({
    example: 3500.5,
    minimum: 0,
    description:
      'Costo del producto. El servidor asigna validFrom y no admite validTo ni createdById en el payload.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost!: number;
}
