import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { ExpectedVersionDto } from '../../common/dto/expected-version.dto';

export class UpdateSaleTicketItemDto extends ExpectedVersionDto {
  @ApiProperty({
    example: 3,
    description: 'Cantidad decimal mayor que 0.',
  })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}
