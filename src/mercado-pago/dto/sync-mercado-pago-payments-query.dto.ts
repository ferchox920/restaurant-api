import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class SyncMercadoPagoPaymentsQueryDto {
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inicio inclusivo. Por defecto, 30 dias antes de to.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Fin inclusivo. Por defecto, el momento actual.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
