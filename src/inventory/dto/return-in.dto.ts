import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ReturnInDto {
  @ApiProperty({
    example: 2,
    minimum: 0.01,
    description: 'Cantidad que reingresa al stock. Debe ser mayor que 0.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({
    example: 'Devolucion interna de producto en buen estado.',
    description: 'Motivo del reingreso manual.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
