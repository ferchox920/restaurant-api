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
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ProductCostsService } from './product-costs.service';
import { ProductPricesService } from './product-prices.service';
import { ProductsService } from './products.service';
import { CreateProductCostDto } from './dto/create-product-cost.dto';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { ProductCostResponseDto } from './dto/product-cost-response.dto';
import { ProductPriceResponseDto } from './dto/product-price-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

@ApiTags('products')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productCostsService: ProductCostsService,
    private readonly productPricesService: ProductPricesService,
  ) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Crear producto vendible',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear productos. Ejemplos: Hamburguesa clasica UNIT FINISHED_PRODUCT, Papas fritas SERVICE FINISHED_PRODUCT, Delivery fee UNIT NON_STOCKED.',
  })
  @ApiCreatedResponse({
    description: 'Producto creado correctamente.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un producto con el SKU informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre productos.',
  })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({
    summary: 'Listar productos',
    description:
      'Requiere JWT. ADMIN, MANAGER, AUDITOR y CASHIER pueden consultar productos.',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description:
      'Filtra por estado activo. Si no se envia, devuelve todos los productos.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filtra por categoria.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Busca por texto en name o sku.',
  })
  @ApiOkResponse({
    description: 'Listado de productos.',
    type: ProductResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description:
      'El parametro active debe ser true o false si se envia.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar productos.',
  })
  findAll(
    @Query('active') active?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findAll({
      active: this.parseActiveFilter(active),
      categoryId,
      search,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({
    summary: 'Obtener producto por id',
    description:
      'Requiere JWT. ADMIN, MANAGER, AUDITOR y CASHIER pueden consultar productos.',
  })
  @ApiOkResponse({
    description: 'Producto encontrado.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar productos.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Post(':id/costs')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Crear nuevo costo historico para un producto',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear costos. El versionado es inmediato: el servidor cierra el costo vigente anterior y crea una nueva version con validFrom actual.',
  })
  @ApiCreatedResponse({
    description: 'Costo historico creado correctamente.',
    type: ProductCostResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Payload invalido, id no valido, producto inactivo o intento de enviar un valor no permitido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para registrar costos.',
  })
  createCost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createProductCostDto: CreateProductCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductCostResponseDto> {
    return this.productCostsService.create(id, createProductCostDto, user.id);
  }

  @Get(':id/costs')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Consultar historial de costos de un producto',
    description:
      'Requiere JWT. ADMIN, MANAGER y AUDITOR pueden consultar el historial de costos. Las versiones se devuelven ordenadas por validFrom descendente.',
  })
  @ApiOkResponse({
    description: 'Historial de costos del producto.',
    type: ProductCostResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar costos.',
  })
  findCostHistory(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProductCostResponseDto[]> {
    return this.productCostsService.findHistory(id);
  }

  @Get(':id/costs/current')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Consultar costo vigente de un producto',
    description:
      'Requiere JWT. ADMIN, MANAGER y AUDITOR pueden consultar el costo vigente. El versionado es inmediato y la version vigente es la que tiene validTo = null.',
  })
  @ApiOkResponse({
    description: 'Costo vigente del producto.',
    type: ProductCostResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto o costo vigente no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar el costo vigente.',
  })
  findCurrentCost(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProductCostResponseDto> {
    return this.productCostsService.findCurrent(id);
  }

  @Post(':id/prices')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Crear nuevo precio historico para un producto y canal',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear precios. El versionado es inmediato: el servidor cierra el precio vigente anterior del mismo producto/canal y crea una nueva version.',
  })
  @ApiCreatedResponse({
    description: 'Precio historico creado correctamente.',
    type: ProductPriceResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Payload invalido, id no valido, producto o canal inactivo, o intento de enviar un valor no permitido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto o canal no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para registrar precios.',
  })
  createPrice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createProductPriceDto: CreateProductPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductPriceResponseDto> {
    return this.productPricesService.create(id, createProductPriceDto, user.id);
  }

  @Get(':id/prices')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({
    summary: 'Consultar historial de precios de un producto',
    description:
      'Requiere JWT. ADMIN, MANAGER y AUDITOR pueden consultar el historial de precios completo o filtrado por canal.',
  })
  @ApiQuery({
    name: 'channelId',
    required: false,
    type: String,
    description:
      'UUID del canal de venta. Si se envia, filtra el historial por producto/canal.',
  })
  @ApiOkResponse({
    description: 'Historial de precios del producto.',
    type: ProductPriceResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'El id informado o channelId deben ser UUID validos si se envian.',
  })
  @ApiNotFoundResponse({
    description: 'Producto o canal no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar historial de precios.',
  })
  findPriceHistory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('channelId') channelId?: string,
  ): Promise<ProductPriceResponseDto[]> {
    return this.findPriceHistoryInternal(id, channelId);
  }

  private async findPriceHistoryInternal(
    id: string,
    channelId?: string,
  ): Promise<ProductPriceResponseDto[]> {
    return this.productPricesService.findHistory(
      id,
      await this.parseOptionalUuid(channelId, 'channelId'),
    );
  }

  @Get(':id/prices/current')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Consultar precio vigente de un producto para un canal',
    description:
      'Requiere JWT. ADMIN, MANAGER, CASHIER y AUDITOR pueden consultar el precio vigente. Debe enviarse channelId y la version vigente es la que tiene validTo = null.',
  })
  @ApiQuery({
    name: 'channelId',
    required: true,
    type: String,
    description: 'UUID del canal de venta requerido para resolver el precio.',
  })
  @ApiOkResponse({
    description: 'Precio vigente del producto para el canal solicitado.',
    type: ProductPriceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado y channelId deben ser UUID validos.',
  })
  @ApiNotFoundResponse({
    description: 'Producto, canal o precio vigente no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar el precio vigente.',
  })
  findCurrentPrice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<ProductPriceResponseDto> {
    return this.productPricesService.findCurrent(id, channelId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Actualizar producto',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden editar productos. Costos y precios se implementaran en Sprint 4; stock en Sprint 5.',
  })
  @ApiOkResponse({
    description: 'Producto actualizado correctamente.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload invalido o id no valido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un producto con el SKU informado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre productos.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Desactivar producto',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden desactivar productos. No elimina informacion historica futura.',
  })
  @ApiOkResponse({
    description: 'Producto desactivado correctamente.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre productos.',
  })
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Reactivar producto',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden reactivar productos.',
  })
  @ApiOkResponse({
    description: 'Producto reactivado correctamente.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos de escritura sobre productos.',
  })
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.reactivate(id, user.id);
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

  private async parseOptionalUuid(
    value: string | undefined,
    fieldName: string,
  ): Promise<string | undefined> {
    if (value === undefined) {
      return undefined;
    }

    const uuidPipe = new ParseUUIDPipe();
    return await uuidPipe.transform(value, {
      type: 'query',
      metatype: String,
      data: fieldName,
    });
  }
}
