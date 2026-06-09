import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function createContext(user?: { role: Role }) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);

    const result = guard.canActivate(createContext({ role: Role.ADMIN }));

    expect(result).toBe(true);
  });

  it('returns false when the request has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([Role.ADMIN]);

    const result = guard.canActivate(createContext());

    expect(result).toBe(false);
  });

  it('throws Forbidden when role is insufficient', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([Role.ADMIN]);

    expect(() => guard.canActivate(createContext({ role: Role.CASHIER }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows access when the user has a required role', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([Role.ADMIN]);

    const result = guard.canActivate(createContext({ role: Role.ADMIN }));

    expect(result).toBe(true);
  });
});
