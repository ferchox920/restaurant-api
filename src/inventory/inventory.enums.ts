export const InventoryMovementType = {
  STOCK_IN: 'STOCK_IN',
  SALE_OUT: 'SALE_OUT',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  WASTE: 'WASTE',
  RETURN_IN: 'RETURN_IN',
  VOID_REVERSAL: 'VOID_REVERSAL',
} as const;

export type InventoryMovementType =
  (typeof InventoryMovementType)[keyof typeof InventoryMovementType];

export const InventoryReferenceType = {
  MANUAL: 'MANUAL',
  SALE_TICKET: 'SALE_TICKET',
  SALE_VOID: 'SALE_VOID',
  SYSTEM: 'SYSTEM',
} as const;

export type InventoryReferenceType =
  (typeof InventoryReferenceType)[keyof typeof InventoryReferenceType];

export const InventoryStockStatus = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  AVAILABLE: 'AVAILABLE',
} as const;

export type InventoryStockStatus =
  (typeof InventoryStockStatus)[keyof typeof InventoryStockStatus];
