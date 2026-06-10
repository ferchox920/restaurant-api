import { AuditAction, AuditEntityType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AUDIT_DEFAULT_LIMIT, AUDIT_MAX_LIMIT } from '../audit.constants';

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    enum: AuditAction,
    example: AuditAction.SALE_TICKET_CONFIRMED,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    enum: AuditEntityType,
    example: AuditEntityType.SALE_TICKET,
  })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @ApiPropertyOptional({
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
    description: 'Identificador de la entidad auditada.',
  })
  @IsOptional()
  entityId?: string;

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
  to?: Date;

  @ApiPropertyOptional({
    example: AUDIT_DEFAULT_LIMIT,
    default: AUDIT_DEFAULT_LIMIT,
    maximum: AUDIT_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AUDIT_MAX_LIMIT)
  limit?: number = AUDIT_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
