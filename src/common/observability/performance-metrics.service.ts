import { Injectable } from '@nestjs/common';

type Sample = { durationMs: number; statusCode: number };

@Injectable()
export class PerformanceMetricsService {
  private readonly samples = new Map<string, Sample[]>();

  record(key: string, sample: Sample): void {
    const values = this.samples.get(key) ?? [];
    values.push(sample);
    if (values.length > 1000) values.splice(0, values.length - 1000);
    this.samples.set(key, values);
  }

  snapshot() {
    return Array.from(this.samples.entries()).map(([route, samples]) => {
      const sorted = samples
        .map((sample) => sample.durationMs)
        .sort((a, b) => a - b);
      const percentile = (value: number) =>
        Number(
          sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)]?.toFixed(
            1,
          ) ?? 0,
        );
      return {
        route,
        count: samples.length,
        errors: samples.filter((sample) => sample.statusCode >= 500).length,
        p50: percentile(0.5),
        p95: percentile(0.95),
        p99: percentile(0.99),
      };
    });
  }
}
