import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Requiere JWT y rol ADMIN.',
  })
  @ApiCreatedResponse({
    description: 'Usuario creado correctamente.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un usuario con el email informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene rol ADMIN.',
  })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Requiere JWT y rol ADMIN.',
  })
  @ApiOkResponse({
    description: 'Listado de usuarios.',
    type: UserResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene rol ADMIN.',
  })
  findAll(@Query() query: PaginationQueryDto): Promise<UserResponseDto[]> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por id',
    description: 'Requiere JWT y rol ADMIN.',
  })
  @ApiOkResponse({
    description: 'Usuario encontrado.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene rol ADMIN.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar datos basicos de usuario',
    description: 'Requiere JWT y rol ADMIN.',
  })
  @ApiOkResponse({
    description: 'Usuario actualizado correctamente.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido o id no valido.',
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un usuario con el email informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene rol ADMIN.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, user.id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({
    summary: 'Desactivar usuario',
    description:
      'Requiere JWT y rol ADMIN. No elimina el registro; solo cambia active=false.',
  })
  @ApiOkResponse({
    description: 'Usuario desactivado correctamente.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  @ApiConflictResponse({
    description: 'No se puede desactivar el ultimo ADMIN activo.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene rol ADMIN.',
  })
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @ApiOperation({
    summary: 'Reactivar usuario',
    description:
      'Requiere JWT y rol ADMIN. Rehabilita el usuario cambiando active=true.',
  })
  @ApiOkResponse({
    description: 'Usuario reactivado correctamente.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene rol ADMIN.',
  })
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.reactivate(id, user.id);
  }
}
