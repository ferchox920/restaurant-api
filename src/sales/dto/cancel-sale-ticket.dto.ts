import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ExpectedVersionDto } from '../../common/dto/expected-version.dto';

export class CancelSaleTicketDto extends ExpectedVersionDto {
  @ApiProperty({ example: 'Cliente desistio de la compra.' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
