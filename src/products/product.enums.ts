export const ProductUnit = {
  UNIT: 'UNIT',
  PORTION: 'PORTION',
  SERVICE: 'SERVICE',
} as const;

export type ProductUnit = (typeof ProductUnit)[keyof typeof ProductUnit];

export const StockManagementType = {
  FINISHED_PRODUCT: 'FINISHED_PRODUCT',
  RECIPE_BASED: 'RECIPE_BASED',
  NON_STOCKED: 'NON_STOCKED',
} as const;

export type StockManagementType =
  (typeof StockManagementType)[keyof typeof StockManagementType];
