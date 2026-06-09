import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  const baseUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    firstName: 'System',
    lastName: 'Admin',
    role: Role.ADMIN,
    active: true,
    lastLoginAt: null,
    createdAt: new Date('2026-06-09T00:00:00.000Z'),
    updatedAt: new Date('2026-06-09T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    service = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns accessToken and sanitized user on successful login', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce(baseUser);
    prismaService.user.update.mockResolvedValueOnce({
      ...baseUser,
      lastLoginAt: new Date('2026-06-09T01:00:00.000Z'),
      updatedAt: new Date('2026-06-09T01:00:00.000Z'),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    jwtService.signAsync.mockResolvedValueOnce('signed-jwt-token');

    const result = await service.login({
      email: 'admin@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('signed-jwt-token');
    expect(result.user).toMatchObject({
      id: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
      active: true,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
    });
  });

  it('throws Unauthorized when password is invalid', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce(baseUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws Unauthorized when email does not exist', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('does not allow inactive users to login', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      active: false,
    });

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('updates lastLoginAt on successful login', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce(baseUser);
    prismaService.user.update.mockImplementationOnce(
      async ({ data }: { data: { lastLoginAt: Date } }) => ({
        ...baseUser,
        lastLoginAt: data.lastLoginAt,
        updatedAt: data.lastLoginAt,
      }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    jwtService.signAsync.mockResolvedValueOnce('signed-jwt-token');

    await service.login({
      email: 'admin@example.com',
      password: 'password123',
    });

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: {
        lastLoginAt: expect.any(Date),
      },
    });
  });
});
