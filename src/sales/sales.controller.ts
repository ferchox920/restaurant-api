import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AddSaleTicketItemDto } from './dto/add-sale-ticket-item.dto';
import { CancelSaleTicketDto } from './dto/cancel-sale-ticket.dto';
import { ConfirmSaleTicketDto } from './dto/confirm-sale-ticket.dto';
import { CreateSaleTicketDto } from './dto/create-sale-ticket.dto';
import { SaleTicketQueryDto } from './dto/sale-ticket-query.dto';
import { SaleTicketResponseDto } from './dto/sale-ticket-response.dto';
import { UpdateSaleTicketItemDto } from './dto/update-sale-ticket-item.dto';
import { UpdateSaleTicketDto } from './dto/update-sale-ticket.dto';
import { VoidSaleTicketDto } from './dto/void-sale-ticket.dto';
import { SalesService } from './sales.service';

@ApiTags('sale-tickets')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/tickets')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Crear ticket de venta en borrador',
    description:
      'Requiere JWT. Crea un ticket en estado DRAFT asociado a un canal activo. El ticket puede nacer vacio.',
  })
  @ApiCreatedResponse({
    description: 'Ticket creado correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Canal de venta no encontrado.' })
  @ApiConflictResponse({ description: 'Canal de venta inactivo.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para crear tickets.',
  })
  create(
    @Body() dto: CreateSaleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.create(dto, user.id);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar tickets de venta',
    description:
      'Requiere JWT. Permite filtrar por estado, canal, rango de fechas, creador y busqueda por ticketNumber o notas.',
  })
  @ApiOkResponse({
    description: 'Listado de tickets.',
    type: SaleTicketResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para consultar tickets.',
  })
  findAll(@Query() query: SaleTicketQueryDto): Promise<SaleTicketResponseDto[]> {
    return this.salesService.findAll(query);
  }

  @Get(':ticketId')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Obtener ticket de venta',
    description: 'Requiere JWT. Devuelve el ticket con sus lineas.',
  })
  @ApiOkResponse({
    description: 'Ticket encontrado.',
    type: SaleTicketResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para consultar tickets.',
  })
  findOne(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.findOne(ticketId);
  }

  @Patch(':ticketId')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Actualizar ticket en borrador',
    description:
      'Requiere JWT. Solo permite actualizar tickets en estado DRAFT. En Sprint 6 solo se actualizan notas.',
  })
  @ApiOkResponse({
    description: 'Ticket actualizado.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  @ApiConflictResponse({
    description: 'El ticket ya no esta en DRAFT y no puede modificarse.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para editar tickets.',
  })
  update(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: UpdateSaleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.update(ticketId, dto, user.id);
  }

  @Post(':ticketId/items')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Agregar linea a ticket en borrador',
    description:
      'Requiere JWT. El cliente solo envia productId y quantity. El servidor toma snapshots, precio vigente, costo vigente y recalcula el ticket.',
  })
  @ApiCreatedResponse({
    description: 'Linea agregada correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({
    description: 'Ticket, producto, costo vigente o precio vigente no encontrado.',
  })
  @ApiConflictResponse({
    description: 'El ticket no esta en DRAFT o el producto esta inactivo.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para editar tickets.',
  })
  addItem(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: AddSaleTicketItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.addItem(ticketId, dto, user.id);
  }

  @Patch(':ticketId/items/:itemId')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Actualizar cantidad de linea',
    description:
      'Requiere JWT. Solo permite modificar lineas de tickets en DRAFT y recalcula subtotal y total.',
  })
  @ApiOkResponse({
    description: 'Linea actualizada correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Ticket o linea no encontrado.' })
  @ApiConflictResponse({
    description: 'El ticket no esta en DRAFT.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para editar tickets.',
  })
  updateItem(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateSaleTicketItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.updateItem(ticketId, itemId, dto, user.id);
  }

  @Delete(':ticketId/items/:itemId')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Quitar linea de ticket',
    description:
      'Requiere JWT. Solo permite quitar lineas de tickets en DRAFT y recalcula subtotal y total.',
  })
  @ApiOkResponse({
    description: 'Linea eliminada correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Ticket o linea no encontrado.' })
  @ApiConflictResponse({
    description: 'El ticket no esta en DRAFT.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para editar tickets.',
  })
  removeItem(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.removeItem(ticketId, itemId, user.id);
  }

  @Post(':ticketId/cancel')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Cancelar ticket en borrador',
    description:
      'Requiere JWT. Cambia el estado a CANCELLED, registra motivo y usuario, y no afecta stock.',
  })
  @ApiOkResponse({
    description: 'Ticket cancelado correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  @ApiConflictResponse({
    description: 'El ticket ya no esta en DRAFT y no puede cancelarse.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para cancelar tickets.',
  })
  cancel(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: CancelSaleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.cancel(ticketId, dto, user.id);
  }

  @Post(':ticketId/confirm')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Confirmar ticket de venta',
    description:
      'Requiere JWT. Confirma un ticket DRAFT, valida stock para productos inventariables y genera movimientos SALE_OUT. No recibe precio, costo ni stock en el body.',
  })
  @ApiOkResponse({
    description: 'Ticket confirmado correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  @ApiConflictResponse({
    description:
      'El ticket no esta en DRAFT, no tiene lineas o no posee stock suficiente para confirmarse.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para confirmar tickets.',
  })
  confirm(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: ConfirmSaleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.confirm(ticketId, dto, user.id);
  }

  @Post(':ticketId/void')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Anular venta confirmada',
    description:
      'Requiere JWT. Anula un ticket CONFIRMED, revierte stock con movimientos VOID_REVERSAL y exige motivo.',
  })
  @ApiOkResponse({
    description: 'Venta anulada correctamente.',
    type: SaleTicketResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  @ApiConflictResponse({
    description: 'El ticket no esta en CONFIRMED y no puede anularse.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para anular ventas.',
  })
  void(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: VoidSaleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleTicketResponseDto> {
    return this.salesService.void(ticketId, dto, user.id);
  }
}
