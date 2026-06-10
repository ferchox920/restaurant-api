import { AuditAction, AuditEntityType } from '@prisma/client';

export type CreateAuditLogInput = {
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
};
