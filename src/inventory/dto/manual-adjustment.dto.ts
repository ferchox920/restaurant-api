import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ManualAdjustmentDto {
  @ApiProperty({
    example: 12,
    minimum: 0,
    description:
      'Stock final deseado luego del ajuste. El servidor calcula la diferencia.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newStock!: number;

  @ApiProperty({
    example: 'Correccion por conteo fisico.',
    description: 'Motivo administrativo del ajuste.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
