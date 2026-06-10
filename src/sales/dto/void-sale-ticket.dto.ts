import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VoidSaleTicketDto {
  @ApiProperty({
    example: 'Cliente solicito anular la venta confirmada.',
    description: 'Motivo operativo de la anulacion de la venta confirmada.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason!: string;
}
