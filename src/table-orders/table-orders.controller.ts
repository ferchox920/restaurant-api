import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AddSaleTicketItemDto } from '../sales/dto/add-sale-ticket-item.dto';
import { ConfirmSaleTicketDto } from '../sales/dto/confirm-sale-ticket.dto';
import { UpdateSaleTicketItemDto } from '../sales/dto/update-sale-ticket-item.dto';
import { CancelTableOrderDto } from './dto/cancel-table-order.dto';
import { OpenTableOrderDto } from './dto/open-table-order.dto';
import { TableOrderQueryDto } from './dto/table-order-query.dto';
import { TableOrderResponseDto } from './dto/table-order-response.dto';
import { TableOrdersService } from './table-orders.service';
import { IdempotencyService } from '../idempotency/idempotency.service';

@ApiTags('table-orders')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TableOrdersController {
  constructor(
    private readonly tableOrdersService: TableOrdersService,
    private readonly idempotency: IdempotencyService = {
      execute: ({ run }: { run: () => Promise<unknown> }) => run(),
    } as unknown as IdempotencyService,
  ) {}

  @Get('table-orders')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.AUDITOR)
  @ApiOperation({ summary: 'Listar ordenes de mesa' })
  @ApiOkResponse({ type: TableOrderResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Filtros invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  findAll(
    @Query() query: TableOrderQueryDto,
  ): Promise<TableOrderResponseDto[]> {
    return this.tableOrdersService.findAll(query);
  }

  @Post('tables/:tableId/orders/open')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Abrir orden en mesa activa' })
  @ApiCreatedResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'Payload o tableId invalido.' })
  @ApiNotFoundResponse({ description: 'Mesa o canal de venta no encontrado.' })
  @ApiConflictResponse({ description: 'Mesa inactiva u ocupada.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  open(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Body() dto: OpenTableOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.open(tableId, dto, user.id);
  }

  @Get('tables/:tableId/orders/current')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.AUDITOR)
  @ApiOperation({ summary: 'Obtener orden abierta actual de una mesa' })
  @ApiOkResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'tableId invalido.' })
  @ApiNotFoundResponse({ description: 'La mesa no tiene orden abierta.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  findCurrentByTable(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.findCurrentByTable(tableId);
  }

  @Get('table-orders/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.AUDITOR)
  @ApiOperation({ summary: 'Obtener orden de mesa por id' })
  @ApiOkResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'id invalido.' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.findOne(id);
  }

  @Post('table-orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Cancelar orden abierta' })
  @ApiOkResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'Payload o id invalido.' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada.' })
  @ApiConflictResponse({ description: 'La orden no esta abierta.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelTableOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.cancel(id, dto, user.id);
  }

  @Post('table-orders/:id/items')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({
    summary: 'Agregar consumo a una orden de mesa abierta',
    description:
      'Delega en el SaleTicket DRAFT asociado. No descuenta stock hasta cerrar la orden.',
  })
  @ApiCreatedResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'Payload o id invalido.' })
  @ApiNotFoundResponse({
    description:
      'Orden, ticket, producto, costo vigente o precio vigente no encontrado.',
  })
  @ApiConflictResponse({
    description: 'La orden no esta abierta o el ticket no esta en DRAFT.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  addItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddSaleTicketItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.addItem(id, dto, user.id);
  }

  @Patch('table-orders/:id/items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({
    summary: 'Modificar consumo de una orden de mesa abierta',
    description:
      'Actualiza la cantidad de una linea del SaleTicket DRAFT asociado.',
  })
  @ApiOkResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'Payload, id o itemId invalido.' })
  @ApiNotFoundResponse({ description: 'Orden, ticket o item no encontrado.' })
  @ApiConflictResponse({
    description: 'La orden no esta abierta o el ticket no esta en DRAFT.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  updateItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateSaleTicketItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.updateItem(id, itemId, dto, user.id);
  }

  @Delete('table-orders/:id/items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({
    summary: 'Quitar consumo de una orden de mesa abierta',
    description: 'Elimina una linea del SaleTicket DRAFT asociado.',
  })
  @ApiOkResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'id o itemId invalido.' })
  @ApiNotFoundResponse({ description: 'Orden, ticket o item no encontrado.' })
  @ApiConflictResponse({
    description: 'La orden no esta abierta o el ticket no esta en DRAFT.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  removeItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableOrderResponseDto> {
    return this.tableOrdersService.removeItem(id, itemId, user.id);
  }

  @Post('table-orders/:id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({
    summary: 'Cerrar orden de mesa',
    description:
      'Confirma el SaleTicket DRAFT asociado, descuenta stock mediante ventas y marca la orden como CLOSED en una sola transaccion.',
  })
  @ApiOkResponse({ type: TableOrderResponseDto })
  @ApiBadRequestResponse({ description: 'Payload o id invalido.' })
  @ApiNotFoundResponse({ description: 'Orden, ticket o pago no encontrado.' })
  @ApiConflictResponse({
    description:
      'La orden no esta abierta, el ticket no esta en DRAFT, no tiene items, falta pago o no hay stock suficiente.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol insuficiente.' })
  close(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmSaleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<TableOrderResponseDto> {
    return this.idempotency.execute({
      key: idempotencyKey,
      userId: user.id,
      operation: `table-order.close:${id}`,
      body: dto,
      run: () => this.tableOrdersService.close(id, dto, user.id),
    });
  }
}
