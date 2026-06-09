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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductUnit, StockManagementType } from './product.enums';

@ApiTags('products')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto);
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
  ): Promise<ProductResponseDto> {
    return this.productsService.deactivate(id);
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
  ): Promise<ProductResponseDto> {
    return this.productsService.reactivate(id);
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
