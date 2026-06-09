import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class StockInDto {
  @ApiProperty({
    example: 24,
    minimum: 0.01,
    description: 'Cantidad a ingresar. Debe ser mayor que 0.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({
    example: 'Produccion terminada del turno noche.',
    description: 'Motivo operativo del ingreso de stock.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
