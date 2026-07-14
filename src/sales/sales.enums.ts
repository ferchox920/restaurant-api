export const SaleTicketStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type SaleTicketStatus =
  (typeof SaleTicketStatus)[keyof typeof SaleTicketStatus];

export const SalePaymentMethod = {
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
} as const;

export type SalePaymentMethod =
  (typeof SalePaymentMethod)[keyof typeof SalePaymentMethod];
