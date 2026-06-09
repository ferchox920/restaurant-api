import { ApiProperty } from '@nestjs/swagger';
import { StockManagementType } from '../../products/product.enums';
import { InventoryStockStatus } from '../inventory.enums';

export class InventoryStockResponseDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Hamburguesa clasica' })
  productName!: string;

  @ApiProperty({
    example: 'BURGER-001',
    nullable: true,
  })
  productSku!: string | null;

  @ApiProperty({ example: 'UNIT' })
  unit!: string;

  @ApiProperty({
    enum: StockManagementType,
    example: StockManagementType.FINISHED_PRODUCT,
  })
  stockManagementType!: StockManagementType;

  @ApiProperty({
    example: '18.50',
    description:
      'Stock actual serializado como string decimal para evitar perdida de precision.',
  })
  currentStock!: string;

  @ApiProperty({
    example: '10.00',
    description:
      'Stock minimo serializado como string decimal para evitar perdida de precision.',
  })
  minimumStock!: string;

  @ApiProperty({
    enum: InventoryStockStatus,
    example: InventoryStockStatus.AVAILABLE,
  })
  stockStatus!: string;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  updatedAt!: Date;
}
