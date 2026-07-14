export const TableOrderStatus = {
  OPEN: 'OPEN',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
} as const;

export type TableOrderStatus =
  (typeof TableOrderStatus)[keyof typeof TableOrderStatus];
