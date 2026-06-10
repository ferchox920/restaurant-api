import { Decimal } from '@prisma/client/runtime/library';
import {
  SalesByChannelReportResponseDto,
} from '../dto/sales-by-channel-report-response.dto';
import {
  SalesByProductReportResponseDto,
} from '../dto/sales-by-product-report-response.dto';
import { SalesByUserReportResponseDto } from '../dto/sales-by-user-report-response.dto';
import { toDecimalString, zeroDecimal } from './report-decimal.mapper';

export function addDecimals(
  left: Decimal,
  right: Decimal | number | string,
): Decimal {
  return left.add(new Decimal(right));
}

export function multiplyDecimals(
  left: Decimal | number | string,
  right: Decimal | number | string,
): Decimal {
  return new Decimal(left).mul(new Decimal(right));
}

export function subtractDecimals(
  left: Decimal | number | string,
  right: Decimal | number | string,
): Decimal {
  return new Decimal(left).sub(new Decimal(right));
}

export function divideDecimals(
  left: Decimal,
  divisor: number,
): Decimal {
  if (divisor === 0) {
    return zeroDecimal();
  }

  return left.div(new Decimal(divisor));
}

export function toSalesByChannelReportResponse(input: {
  salesChannelId: string;
  salesChannelName: string;
  salesChannelCode: string;
  ticketsCount: number;
  itemsCount: number;
  quantitySold: Decimal;
  grossSales: Decimal;
  historicalCost: Decimal;
  grossProfit: Decimal;
  averageTicket: Decimal;
}): SalesByChannelReportResponseDto {
  return {
    ...input,
    quantitySold: toDecimalString(input.quantitySold),
    grossSales: toDecimalString(input.grossSales),
    historicalCost: toDecimalString(input.historicalCost),
    grossProfit: toDecimalString(input.grossProfit),
    averageTicket: toDecimalString(input.averageTicket),
  };
}

export function toSalesByProductReportResponse(input: {
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string | null;
  productUnitSnapshot: string;
  quantitySold: Decimal;
  grossSales: Decimal;
  historicalCost: Decimal;
  grossProfit: Decimal;
  ticketsCount: number;
}): SalesByProductReportResponseDto {
  return {
    ...input,
    quantitySold: toDecimalString(input.quantitySold),
    grossSales: toDecimalString(input.grossSales),
    historicalCost: toDecimalString(input.historicalCost),
    grossProfit: toDecimalString(input.grossProfit),
  };
}

export function toSalesByUserReportResponse(input: {
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  ticketsCount: number;
  itemsCount: number;
  quantitySold: Decimal;
  grossSales: Decimal;
  historicalCost: Decimal;
  grossProfit: Decimal;
}): SalesByUserReportResponseDto {
  return {
    ...input,
    quantitySold: toDecimalString(input.quantitySold),
    grossSales: toDecimalString(input.grossSales),
    historicalCost: toDecimalString(input.historicalCost),
    grossProfit: toDecimalString(input.grossProfit),
  };
}
