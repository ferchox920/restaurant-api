import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { toUserResponse } from '../users/user-response.mapper';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';

export type LoginResult = AuthResponseDto & { sessionToken?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService = {
      get: () => undefined,
    } as unknown as ConfigService,
  ) {}

  async login(loginDto: LoginDto, device?: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const lastLoginAt = new Date();
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt },
    });

    const cookieEnabled =
      this.configService.get<boolean>('AUTH_COOKIE') ?? false;
    const jti = cookieEnabled ? randomUUID() : undefined;
    const payload: JwtPayload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    if (jti) {
      const decoded = this.jwtService.decode<{ exp?: number }>(accessToken);
      await this.prisma.authSession.create({
        data: {
          jtiHash: this.hashJti(jti),
          userId: updatedUser.id,
          expiresAt: new Date((decoded.exp ?? 0) * 1000),
          device: device?.slice(0, 255),
        },
      });
    }

    return {
      ...(this.configService.get<boolean>('AUTH_TOKEN_RESPONSE') !== false
        ? { accessToken }
        : {}),
      ...(cookieEnabled ? { sessionToken: accessToken } : {}),
      user: toUserResponse(updatedUser),
    };
  }

  async revokeSession(jti: string | undefined): Promise<void> {
    if (!jti) return;
    await this.prisma.authSession.updateMany({
      where: { jtiHash: this.hashJti(jti), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  hashJti(jti: string): string {
    return createHash('sha256').update(jti).digest('hex');
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return toUserResponse(user);
  }
}
