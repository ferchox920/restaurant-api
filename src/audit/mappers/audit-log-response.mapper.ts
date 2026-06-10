import { AuditLog } from '@prisma/client';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';

export function toAuditLogResponse(
  auditLog: AuditLog,
): AuditLogResponseDto {
  return {
    id: auditLog.id,
    userId: auditLog.userId,
    action: auditLog.action,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    beforeData: (auditLog.beforeData as AuditLogResponseDto['beforeData']) ?? null,
    afterData: (auditLog.afterData as AuditLogResponseDto['afterData']) ?? null,
    metadata: (auditLog.metadata as AuditLogResponseDto['metadata']) ?? null,
    createdAt: auditLog.createdAt,
  };
}
