import { StockReportResponseDto } from './stock-report-response.dto';

export type StockReportSummaryDto = {
  available: number;
  lowStock: number;
  outOfStock: number;
  notTracked: number;
};

export type StockReportPagedResponseDto = {
  items: StockReportResponseDto[];
  summary: StockReportSummaryDto;
  total: number;
  limit: number;
  offset: number;
};
