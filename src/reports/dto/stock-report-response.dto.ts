import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockManagementType } from '../../products/product.enums';
import { ReportStockStatus } from '../reports.enums';

export class StockReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Hamburguesa clasica' })
  productName!: string;

  @ApiPropertyOptional({ example: 'BURGER-001', nullable: true })
  productSku!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
    nullable: true,
  })
  categoryId!: string | null;

  @ApiPropertyOptional({
    example: 'Hamburguesas',
    nullable: true,
  })
  categoryName!: string | null;

  @ApiProperty({ example: 'UNIT' })
  unit!: string;

  @ApiProperty({
    enum: StockManagementType,
    example: StockManagementType.FINISHED_PRODUCT,
  })
  stockManagementType!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({
    example: '10.00',
    description:
      'Stock actual serializado como string decimal para evitar perdida de precision.',
  })
  currentStock!: string;

  @ApiProperty({
    example: '3.00',
    description:
      'Stock minimo serializado como string decimal para evitar perdida de precision.',
  })
  minimumStock!: string;

  @ApiProperty({
    enum: ReportStockStatus,
    example: ReportStockStatus.AVAILABLE,
  })
  stockStatus!: string;

  @ApiProperty({ example: '2026-06-10T03:00:00.000Z' })
  updatedAt!: Date;
}
