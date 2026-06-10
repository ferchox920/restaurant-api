import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateSaleTicketItemDto {
  @ApiProperty({
    example: 3,
    description: 'Cantidad decimal mayor que 0.',
  })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}
