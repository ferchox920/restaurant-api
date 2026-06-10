import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSaleTicketDto {
  @ApiProperty({ example: 'Cliente desistio de la compra.' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
