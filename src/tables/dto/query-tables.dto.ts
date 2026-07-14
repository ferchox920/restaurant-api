import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryTablesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Filtra por estado activo. Debe ser true o false si se envia.',
  })
  @IsOptional()
  @IsString()
  active?: string;

  @ApiPropertyOptional({ example: 'Salon principal' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    example: 'M01',
    description: 'Busca por code, name o area.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string;
}
