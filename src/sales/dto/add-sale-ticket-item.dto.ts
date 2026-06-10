import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class AddSaleTicketItemDto {
  @ApiProperty({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 2,
    description: 'Cantidad decimal mayor que 0.',
  })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}
