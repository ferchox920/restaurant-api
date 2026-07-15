import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './types/authenticated-user.type';
import { UserResponseDto } from '../users/dto/user-response.dto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Iniciar sesion con email y password',
    description:
      'No requiere Bearer token. Devuelve un JWT y el usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Login exitoso.',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales invalidas o usuario inactivo.',
  })
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(
      loginDto,
      request.header('user-agent'),
    );
    if (result.sessionToken) {
      response.cookie('restaurant_session', result.sessionToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return {
      ...(result.accessToken ? { accessToken: result.accessToken } : {}),
      user: result.user,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.revokeSession(user.sessionJti);
    response.clearCookie('restaurant_session', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener usuario autenticado',
    description:
      'Requiere Bearer token valido y devuelve el usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Usuario autenticado.',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token invalido, ausente o usuario inactivo/no existente.',
  })
  me(@CurrentUser() user: AuthenticatedUser): UserResponseDto {
    return user;
  }
}
