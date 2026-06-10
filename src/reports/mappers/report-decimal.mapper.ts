import { Decimal } from '@prisma/client/runtime/library';

export function toDecimalString(value: Decimal | number | string): string {
  if (value instanceof Decimal) {
    return value.toString();
  }

  return new Decimal(value).toString();
}

export function zeroDecimal(): Decimal {
  return new Decimal(0);
}
