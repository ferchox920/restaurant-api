import {
  BadRequestException,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateTableDto } from './dto/create-table.dto';
import { QueryTablesDto } from './dto/query-tables.dto';
import { TableResponseDto } from './dto/table-response.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesService } from './tables.service';

@ApiTags('tables')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Crear mesa del salon' })
  @ApiCreatedResponse({ type: TableResponseDto })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiConflictResponse({ description: 'Ya existe una mesa con ese codigo.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  create(
    @Body() dto: CreateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableResponseDto> {
    return this.tablesService.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.AUDITOR)
  @ApiOperation({
    summary: 'Listar mesas',
    description:
      'Requiere JWT. Permite filtrar por active, area y busqueda por code, name o area.',
  })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'area', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ type: TableResponseDto, isArray: true })
  findAll(@Query() query: QueryTablesDto): Promise<TableResponseDto[]> {
    return this.tablesService.findAll({
      active: this.parseActiveFilter(query.active),
      area: query.area,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':tableId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.AUDITOR)
  @ApiOperation({ summary: 'Obtener mesa por id' })
  @ApiOkResponse({ type: TableResponseDto })
  @ApiBadRequestResponse({ description: 'tableId invalido.' })
  @ApiNotFoundResponse({ description: 'Mesa no encontrada.' })
  findOne(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
  ): Promise<TableResponseDto> {
    return this.tablesService.findOne(tableId);
  }

  @Patch(':tableId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Actualizar mesa' })
  @ApiOkResponse({ type: TableResponseDto })
  @ApiBadRequestResponse({ description: 'Payload o tableId invalido.' })
  @ApiNotFoundResponse({ description: 'Mesa no encontrada.' })
  @ApiConflictResponse({ description: 'Ya existe una mesa con ese codigo.' })
  update(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableResponseDto> {
    return this.tablesService.update(tableId, dto, user.id);
  }

  @Patch(':tableId/deactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Desactivar mesa' })
  @ApiOkResponse({ type: TableResponseDto })
  deactivate(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableResponseDto> {
    return this.tablesService.deactivate(tableId, user.id);
  }

  @Patch(':tableId/reactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Reactivar mesa' })
  @ApiOkResponse({ type: TableResponseDto })
  reactivate(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableResponseDto> {
    return this.tablesService.reactivate(tableId, user.id);
  }

  private parseActiveFilter(active?: string): boolean | undefined {
    if (active === undefined) {
      return undefined;
    }

    if (active === 'true') {
      return true;
    }

    if (active === 'false') {
      return false;
    }

    throw new BadRequestException(
      'Query parameter "active" must be either "true" or "false".',
    );
  }
}
