import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

export class SalesByUserQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsOptional()
  @IsUUID()
  salesChannelId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
