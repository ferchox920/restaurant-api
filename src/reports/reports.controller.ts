import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryMovementsReportQueryDto } from './dto/inventory-movements-report-query.dto';
import { InventoryMovementsReportResponseDto } from './dto/inventory-movements-report-response.dto';
import { SalesByChannelQueryDto } from './dto/sales-by-channel-query.dto';
import { SalesByChannelReportResponseDto } from './dto/sales-by-channel-report-response.dto';
import { SalesByProductQueryDto } from './dto/sales-by-product-query.dto';
import { SalesByProductReportResponseDto } from './dto/sales-by-product-report-response.dto';
import { SalesByUserQueryDto } from './dto/sales-by-user-query.dto';
import { SalesByUserReportResponseDto } from './dto/sales-by-user-report-response.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { StockReportResponseDto } from './dto/stock-report-response.dto';
import { StockReportPagedResponseDto } from './dto/stock-report-paged-response.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar stock actual para reportes operativos',
    description:
      'Requiere JWT. Devuelve productos con categoria, proyeccion actual de stock y estado derivado.',
  })
  @ApiOkResponse({
    description: 'Reporte de stock actual.',
    type: StockReportResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar reportes.',
  })
  getStockReport(
    @Query() query: StockReportQueryDto,
  ): Promise<StockReportResponseDto[] | StockReportPagedResponseDto> {
    return this.reportsService.getStockReport(query);
  }

  @Get('sales-by-channel')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar ventas confirmadas agrupadas por canal',
    description:
      'Requiere JWT. Usa solo tickets CONFIRMED y snapshots historicos de las lineas.',
  })
  @ApiOkResponse({
    description: 'Reporte de ventas por canal.',
    type: SalesByChannelReportResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar reportes.',
  })
  getSalesByChannelReport(
    @Query() query: SalesByChannelQueryDto,
  ): Promise<SalesByChannelReportResponseDto[]> {
    return this.reportsService.getSalesByChannelReport(query);
  }

  @Get('sales-by-product')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar ventas confirmadas agrupadas por producto',
    description:
      'Requiere JWT. Usa snapshots historicos de nombre, SKU, unidad, precio y costo.',
  })
  @ApiOkResponse({
    description: 'Reporte de ventas por producto.',
    type: SalesByProductReportResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar reportes.',
  })
  getSalesByProductReport(
    @Query() query: SalesByProductQueryDto,
  ): Promise<SalesByProductReportResponseDto[]> {
    return this.reportsService.getSalesByProductReport(query);
  }

  @Get('sales-by-user')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar ventas confirmadas agrupadas por usuario confirmador',
    description:
      'Requiere JWT. Agrupa por confirmedById para reflejar quien hizo efectiva la venta.',
  })
  @ApiOkResponse({
    description: 'Reporte de ventas por usuario.',
    type: SalesByUserReportResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar reportes.',
  })
  getSalesByUserReport(
    @Query() query: SalesByUserQueryDto,
  ): Promise<SalesByUserReportResponseDto[]> {
    return this.reportsService.getSalesByUserReport(query);
  }

  @Get('inventory-movements')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar movimientos de inventario para reportes operativos',
    description:
      'Requiere JWT. Permite filtrar por producto, tipo de movimiento, tipo de referencia, usuario creador y rango de fechas. Devuelve resultados paginados.',
  })
  @ApiOkResponse({
    description: 'Reporte paginado de movimientos de inventario.',
    type: InventoryMovementsReportResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar reportes.',
  })
  getInventoryMovementsReport(
    @Query() query: InventoryMovementsReportQueryDto,
  ): Promise<InventoryMovementsReportResponseDto> {
    return this.reportsService.getInventoryMovementsReport(query);
  }
}
