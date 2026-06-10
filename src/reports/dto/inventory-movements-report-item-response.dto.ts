import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryMovementType,
  InventoryReferenceType,
} from '../../inventory/inventory.enums';

export class InventoryMovementsReportItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  movementId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Hamburguesa clasica' })
  productName!: string;

  @ApiPropertyOptional({ example: 'BURGER-001', nullable: true })
  productSku!: string | null;

  @ApiProperty({
    enum: InventoryMovementType,
    example: InventoryMovementType.STOCK_IN,
  })
  movementType!: string;

  @ApiProperty({
    example: '12.00',
    description:
      'Cantidad serializada como string decimal para evitar perdida de precision.',
  })
  quantity!: string;

  @ApiProperty({
    example: '8.00',
    description:
      'Stock anterior serializado como string decimal para evitar perdida de precision.',
  })
  previousStock!: string;

  @ApiProperty({
    example: '20.00',
    description:
      'Stock nuevo serializado como string decimal para evitar perdida de precision.',
  })
  newStock!: string;

  @ApiProperty({ example: 'Reposicion de produccion.' })
  reason!: string;

  @ApiProperty({
    enum: InventoryReferenceType,
    example: InventoryReferenceType.MANUAL,
  })
  referenceType!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'ref-123',
  })
  referenceId!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
  })
  createdById!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'manager@example.com',
  })
  createdByEmail!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Ada Lovelace',
  })
  createdByName!: string | null;

  @ApiProperty({ example: '2026-06-09T03:00:00.000Z' })
  createdAt!: Date;
}
