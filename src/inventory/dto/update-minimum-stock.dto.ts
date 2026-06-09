import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateMinimumStockDto {
  @ApiProperty({
    example: 10,
    minimum: 0,
    description: 'Stock minimo deseado para alertas operativas.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock!: number;
}
