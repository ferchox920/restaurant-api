import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class WasteDto {
  @ApiProperty({
    example: 3,
    minimum: 0.01,
    description: 'Cantidad descartada. Debe ser mayor que 0.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({
    example: 'Producto vencido.',
    description: 'Motivo de la merma o descarte.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
