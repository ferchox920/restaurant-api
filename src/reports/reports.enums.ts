export const ReportStockStatus = {
  AVAILABLE: 'AVAILABLE',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  NOT_TRACKED: 'NOT_TRACKED',
} as const;

export type ReportStockStatus =
  (typeof ReportStockStatus)[keyof typeof ReportStockStatus];
