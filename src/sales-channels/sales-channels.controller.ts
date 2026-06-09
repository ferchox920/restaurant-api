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
import { CommissionType, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { SalesChannelsService } from './sales-channels.service';
import { CreateSalesChannelDto } from './dto/create-sales-channel.dto';
import { UpdateSalesChannelDto } from './dto/update-sales-channel.dto';
import { SalesChannelResponseDto } from './dto/sales-channel-response.dto';

@ApiTags('sales-channels')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-channels')
export class SalesChannelsController {
  constructor(private readonly salesChannelsService: SalesChannelsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Crear canal de venta',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear canales. Ejemplos: Mostrador sin comision, PedidosYa con comision porcentual, Uber Eats con comision porcentual.',
  })
  @ApiCreatedResponse({
    description: 'Canal de venta creado correctamente.',
    type: SalesChannelResponseDto,
  })
  @ApiConflictResponse({
    description: 'Ya existe un canal con el nombre o codigo informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre canales de venta.',
  })
  create(
    @Body() createSalesChannelDto: CreateSalesChannelDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalesChannelResponseDto> {
    return this.salesChannelsService.create(createSalesChannelDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AUDITOR, Role.CASHIER)
  @ApiOperation({
    summary: 'Listar canales de venta',
    description:
      'Requiere JWT. ADMIN, MANAGER, AUDITOR y CASHIER pueden consultar canales de venta.',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description:
      'Filtra por estado activo. Si no se envia, devuelve todos los canales.',
  })
  @ApiOkResponse({
    description: 'Listado de canales de venta.',
    type: SalesChannelResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar canales de venta.',
  })
  findAll(
    @Query('active') active?: string,
  ): Promise<SalesChannelResponseDto[]> {
    return this.salesChannelsService.findAll(this.parseActiveFilter(active));
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.AUDITOR, Role.CASHIER)
  @ApiOperation({
    summary: 'Obtener canal de venta por id',
    description:
      'Requiere JWT. ADMIN, MANAGER, AUDITOR y CASHIER pueden consultar canales de venta.',
  })
  @ApiOkResponse({
    description: 'Canal de venta encontrado.',
    type: SalesChannelResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Canal de venta no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar canales de venta.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SalesChannelResponseDto> {
    return this.salesChannelsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Actualizar canal de venta',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden editar canales. Un canal inactivo no deberia usarse para ventas futuras en sprints posteriores.',
  })
  @ApiOkResponse({
    description: 'Canal de venta actualizado correctamente.',
    type: SalesChannelResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Canal de venta no encontrado.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un canal con el nombre o codigo informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre canales de venta.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSalesChannelDto: UpdateSalesChannelDto,
  ): Promise<SalesChannelResponseDto> {
    return this.salesChannelsService.update(id, updateSalesChannelDto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Desactivar canal de venta',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden desactivar canales. No elimina historico futuro de referencia.',
  })
  @ApiOkResponse({
    description: 'Canal de venta desactivado correctamente.',
    type: SalesChannelResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Canal de venta no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre canales de venta.',
  })
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SalesChannelResponseDto> {
    return this.salesChannelsService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Reactivar canal de venta',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden reactivar canales.',
  })
  @ApiOkResponse({
    description: 'Canal de venta reactivado correctamente.',
    type: SalesChannelResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Canal de venta no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre canales de venta.',
  })
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SalesChannelResponseDto> {
    return this.salesChannelsService.reactivate(id);
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
