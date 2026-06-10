import { ApiProperty } from '@nestjs/swagger';
import { InventoryMovementsReportItemResponseDto } from './inventory-movements-report-item-response.dto';

export class InventoryMovementsReportResponseDto {
  @ApiProperty({
    type: InventoryMovementsReportItemResponseDto,
    isArray: true,
  })
  items!: InventoryMovementsReportItemResponseDto[];

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ example: 125 })
  total!: number;
}
