import { AuditAction, AuditEntityType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty({
    enum: AuditAction,
    example: AuditAction.SALE_TICKET_CONFIRMED,
  })
  action!: AuditAction;

  @ApiProperty({
    enum: AuditEntityType,
    example: AuditEntityType.SALE_TICKET,
  })
  entityType!: AuditEntityType;

  @ApiPropertyOptional({
    nullable: true,
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
  })
  entityId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Object,
  })
  beforeData!: Record<string, unknown> | unknown[] | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Object,
  })
  afterData!: Record<string, unknown> | unknown[] | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Object,
  })
  metadata!: Record<string, unknown> | unknown[] | null;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  createdAt!: Date;
}
