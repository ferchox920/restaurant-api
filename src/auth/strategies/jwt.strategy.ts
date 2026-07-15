import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          const match = request.headers.cookie?.match(
            /(?:^|;\s*)restaurant_session=([^;]+)/,
          );
          return match ? decodeURIComponent(match[1]!) : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.jti) {
      const session = await this.prisma.authSession.findUnique({
        where: {
          jtiHash: createHash('sha256').update(payload.jti).digest('hex'),
        },
        select: { revokedAt: true, expiresAt: true },
      });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Invalid credentials.');
      }
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      sessionJti: payload.jti,
    };
  }
}
