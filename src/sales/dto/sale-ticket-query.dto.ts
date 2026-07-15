import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsNotBefore } from '../../common/validation/is-not-before.decorator';
import {
  SaleTicketStatus,
  type SaleTicketStatus as SaleTicketStatusValue,
} from '../sales.enums';

export class SaleTicketQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['summary'] })
  @IsOptional()
  @IsIn(['summary'])
  responseMode?: 'summary';

  @ApiPropertyOptional({
    enum: SaleTicketStatus,
    example: SaleTicketStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(SaleTicketStatus)
  status?: SaleTicketStatusValue;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsOptional()
  @IsUUID()
  salesChannelId?: string;

  @ApiPropertyOptional({
    example: '2026-06-09T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    example: '2026-06-10T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsNotBefore('from')
  to?: Date;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({
    example: '1001',
    description: 'Busca por ticketNumber exacto o texto en notas.',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  search?: string;
}
