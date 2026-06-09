import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesion con email y password',
    description: 'No requiere Bearer token. Devuelve un JWT y el usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Login exitoso.',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales invalidas o usuario inactivo.',
  })
  @HttpCode(200)
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener usuario autenticado',
    description: 'Requiere Bearer token valido y devuelve el usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Usuario autenticado.',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token invalido, ausente o usuario inactivo/no existente.',
  })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }
}
