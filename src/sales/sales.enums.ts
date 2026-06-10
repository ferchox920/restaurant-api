export const SaleTicketStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type SaleTicketStatus =
  (typeof SaleTicketStatus)[keyof typeof SaleTicketStatus];
