import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ExpectedVersionDto } from '../../common/dto/expected-version.dto';

export class OpenTableOrderDto extends ExpectedVersionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salesChannelId!: string;

  @ApiPropertyOptional({ example: 'Cliente frecuente.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  notes?: string;
}
