import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ExpectedVersionDto } from '../../common/dto/expected-version.dto';

export class CancelTableOrderDto extends ExpectedVersionDto {
  @ApiProperty({ example: 'Cliente se retiro antes de consumir.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
