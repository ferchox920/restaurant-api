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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { InventoryMovementsQueryDto } from './dto/inventory-movements-query.dto';
import { InventoryMovementResponseDto } from './dto/inventory-movement-response.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { InventoryStockResponseDto } from './dto/inventory-stock-response.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { ReturnInDto } from './dto/return-in.dto';
import { StockInDto } from './dto/stock-in.dto';
import { UpdateMinimumStockDto } from './dto/update-minimum-stock.dto';
import { WasteDto } from './dto/waste.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar inventario de producto finalizado',
    description:
      'Requiere JWT. Devuelve solo productos FINISHED_PRODUCT y permite filtrar por active, stockStatus y search.',
  })
  @ApiOkResponse({
    description: 'Listado de stock actual por producto.',
    type: InventoryStockResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Filtros de consulta invalidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para consultar inventario.',
  })
  getInventory(
    @Query() query: InventoryQueryDto,
  ): Promise<InventoryStockResponseDto[]> {
    return this.inventoryService.getInventory(query);
  }

  @Get('movements')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar movimientos de inventario',
    description:
      'Requiere JWT. Permite filtrar por producto, tipo de movimiento y rango de fechas.',
  })
  @ApiOkResponse({
    description: 'Listado de movimientos de inventario.',
    type: InventoryMovementResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Filtros de consulta invalidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para consultar movimientos.',
  })
  getMovements(
    @Query() query: InventoryMovementsQueryDto,
  ): Promise<InventoryMovementResponseDto[]> {
    return this.inventoryService.getMovements(query);
  }

  @Get('products/:productId')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Obtener stock actual de un producto finalizado',
    description:
      'Requiere JWT. Devuelve stock 0 si el producto FINISHED_PRODUCT aun no tiene fila en ProductStock.',
  })
  @ApiOkResponse({
    description: 'Stock actual del producto.',
    type: InventoryStockResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'El producto no participa en inventario de Sprint 5 porque es NON_STOCKED o RECIPE_BASED.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para consultar inventario.',
  })
  getProductInventory(
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<InventoryStockResponseDto> {
    return this.inventoryService.getProductInventory(productId);
  }

  @Get('products/:productId/movements')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Obtener movimientos de inventario de un producto',
    description:
      'Requiere JWT. Devuelve el historial del producto finalizado ordenado por createdAt descendente.',
  })
  @ApiOkResponse({
    description: 'Historial de movimientos del producto.',
    type: InventoryMovementResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Filtros de consulta invalidos.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'El producto no participa en inventario de Sprint 5 porque es NON_STOCKED o RECIPE_BASED.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para consultar movimientos.',
  })
  getProductMovements(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query() query: InventoryMovementsQueryDto,
  ): Promise<InventoryMovementResponseDto[]> {
    return this.inventoryService.getProductMovements(productId, {
      movementType: query.movementType,
      from: query.from,
      to: query.to,
    });
  }

  @Post('products/:productId/stock-in')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Registrar ingreso de stock',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear movimientos STOCK_IN. Ejemplo: {"quantity":3,"reason":"Produccion inicial del dia"}',
  })
  @ApiCreatedResponse({
    description: 'Movimiento STOCK_IN creado correctamente.',
    type: InventoryMovementResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'Producto inactivo o no inventariable en Sprint 5.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para agregar stock.',
  })
  stockIn(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: StockInDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InventoryMovementResponseDto> {
    return this.inventoryService.stockIn(productId, dto, user.id);
  }

  @Post('products/:productId/adjust')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Registrar ajuste manual de stock',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear movimientos MANUAL_ADJUSTMENT. Ejemplo: {"newStock":5,"reason":"Conteo fisico de cierre"}',
  })
  @ApiCreatedResponse({
    description: 'Movimiento MANUAL_ADJUSTMENT creado correctamente.',
    type: InventoryMovementResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'Producto inactivo, no inventariable, o ajuste sin cambios efectivos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para ajustar stock.',
  })
  manualAdjust(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: ManualAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InventoryMovementResponseDto> {
    return this.inventoryService.manualAdjust(productId, dto, user.id);
  }

  @Post('products/:productId/waste')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Registrar merma de stock',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear movimientos WASTE. Ejemplo: {"quantity":1,"reason":"Producto danado"}',
  })
  @ApiCreatedResponse({
    description: 'Movimiento WASTE creado correctamente.',
    type: InventoryMovementResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'Producto inactivo, no inventariable o stock insuficiente.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para registrar merma.',
  })
  registerWaste(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: WasteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InventoryMovementResponseDto> {
    return this.inventoryService.registerWaste(productId, dto, user.id);
  }

  @Post('products/:productId/return-in')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Registrar reingreso manual de stock',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear movimientos RETURN_IN. Ejemplo: {"quantity":1,"reason":"Reingreso manual"}',
  })
  @ApiCreatedResponse({
    description: 'Movimiento RETURN_IN creado correctamente.',
    type: InventoryMovementResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'Producto inactivo o no inventariable en Sprint 5.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos para registrar reingreso.',
  })
  returnIn(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: ReturnInDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InventoryMovementResponseDto> {
    return this.inventoryService.returnIn(productId, dto, user.id);
  }

  @Patch('products/:productId/minimum-stock')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Actualizar stock minimo',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden actualizar minimumStock. Ejemplo: {"minimumStock":2}',
  })
  @ApiOkResponse({
    description: 'Stock minimo actualizado correctamente.',
    type: InventoryStockResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'El producto no participa en inventario de Sprint 5 porque es NON_STOCKED o RECIPE_BASED.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para actualizar stock minimo.',
  })
  updateMinimumStock(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: UpdateMinimumStockDto,
  ): Promise<InventoryStockResponseDto> {
    return this.inventoryService.updateMinimumStock(productId, dto);
  }
}
