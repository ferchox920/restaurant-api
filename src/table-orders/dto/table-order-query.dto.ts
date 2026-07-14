import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsNotBefore } from '../../common/validation/is-not-before.decorator';
import {
  TableOrderStatus,
  type TableOrderStatus as TableOrderStatusValue,
} from '../table-orders.enums';

export class TableOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TableOrderStatus })
  @IsOptional()
  @IsEnum(TableOrderStatus)
  status?: TableOrderStatusValue;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  openedById?: string;

  @ApiPropertyOptional({ example: '2026-06-30T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsNotBefore('from')
  to?: Date;
}
