export const CommissionType = {
  NONE: 'NONE',
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;

export type CommissionType =
  (typeof CommissionType)[keyof typeof CommissionType];
