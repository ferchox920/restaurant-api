import { PATH_METADATA, GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController metadata', () => {
  let controller: AuditController;

  beforeEach(() => {
    controller = new AuditController({} as AuditService);
  });

  it('uses the /audit-logs route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditController)).toBe(
      'audit-logs',
    );
  });

  it('requires JWT and role guards on every endpoint via class metadata', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AuditController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('allows only ADMIN and AUDITOR to read audit logs', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual([
      Role.ADMIN,
      Role.AUDITOR,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).not.toContain(
      Role.MANAGER,
    );
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).not.toContain(
      Role.CASHIER,
    );
  });
});
