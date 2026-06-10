import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSaleTicketDto {
  @ApiProperty({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  @IsUUID()
  salesChannelId!: string;

  @ApiPropertyOptional({ example: 'Mesa 4 - cliente frecuente.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
