import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class ExpectedVersionDto {
  @ApiPropertyOptional({
    example: '3',
    description: 'Version visible del agregado.',
  })
  @IsOptional()
  @Matches(/^\d+$/)
  expectedVersion?: string;
}
