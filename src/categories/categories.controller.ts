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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivePaginationQueryDto } from '../common/dto/active-pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Crear categoria',
    description: 'Requiere JWT. Solo ADMIN y MANAGER pueden crear categorias.',
  })
  @ApiCreatedResponse({
    description: 'Categoria creada correctamente.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiConflictResponse({
    description: 'Ya existe una categoria con el nombre informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre categorias.',
  })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AUDITOR, Role.CASHIER)
  @ApiOperation({
    summary: 'Listar categorias',
    description:
      'Requiere JWT. ADMIN, MANAGER, AUDITOR y CASHIER pueden consultar categorias.',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description:
      'Filtra por estado activo. Si no se envia, devuelve todas las categorias.',
  })
  @ApiOkResponse({
    description: 'Listado de categorias.',
    type: CategoryResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'El parametro active debe ser true o false si se envia.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar categorias.',
  })
  findAll(
    @Query() query: ActivePaginationQueryDto,
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(query.active, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.AUDITOR, Role.CASHIER)
  @ApiOperation({
    summary: 'Obtener categoria por id',
    description:
      'Requiere JWT. ADMIN, MANAGER, AUDITOR y CASHIER pueden consultar categorias.',
  })
  @ApiOkResponse({
    description: 'Categoria encontrada.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Categoria no encontrada.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar categorias.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Actualizar categoria',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden editar categorias. Las categorias inactivas no deberian usarse para nuevos productos en sprints posteriores.',
  })
  @ApiOkResponse({
    description: 'Categoria actualizada correctamente.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido o id no valido.',
  })
  @ApiNotFoundResponse({
    description: 'Categoria no encontrada.',
  })
  @ApiConflictResponse({
    description: 'Ya existe una categoria con el nombre informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre categorias.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Desactivar categoria',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden desactivar categorias. No elimina productos asociados.',
  })
  @ApiOkResponse({
    description: 'Categoria desactivada correctamente.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Categoria no encontrada.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre categorias.',
  })
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Reactivar categoria',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden reactivar categorias.',
  })
  @ApiOkResponse({
    description: 'Categoria reactivada correctamente.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Categoria no encontrada.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre categorias.',
  })
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.reactivate(id, user.id);
  }
}
