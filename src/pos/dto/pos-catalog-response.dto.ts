export type PosCatalogItemDto = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unit: string;
  stockManagementType: string;
  stockStatus: string;
  currentStock: string | null;
  currentPrice: string;
  active: boolean;
};

export type PosCatalogResponseDto = {
  items: PosCatalogItemDto[];
  categories: Array<{ id: string; name: string }>;
  nextCursor: string | null;
};
