import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSaleTicketDto {
  @ApiPropertyOptional({ example: 'Cliente solicita sin cebolla.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
