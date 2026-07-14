import { ProductResponseDto } from './dto/product-response.dto';
import { ProductUnit, StockManagementType } from './product.enums';

export type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  categoryId: string | null;
  unit: ProductUnit;
  stockManagementType: StockManagementType;
  active: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toProductResponse(product: ProductRecord): ProductResponseDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    categoryId: product.categoryId,
    unit: product.unit,
    stockManagementType: product.stockManagementType,
    active: product.active,
    createdById: product.createdById,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
